import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Lazy initialization to avoid build-time errors
let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return supabase;
}

// Verify webhook signature
function verifySignature(payload: string, signature: string): boolean {
  const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET!;
  const hmac = crypto.createHmac('sha256', webhookSecret);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-signature');

    if (!signature || !verifySignature(body, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    const eventName = event.meta.event_name;
    const customData = event.meta.custom_data || {};
    const userId = customData.user_id;

    console.log('LemonSqueezy webhook event:', eventName);

    switch (eventName) {
      case 'subscription_created':
      case 'subscription_updated': {
        await handleSubscriptionUpdate(event, userId);
        break;
      }

      case 'subscription_cancelled':
      case 'subscription_expired': {
        await handleSubscriptionCanceled(event, userId);
        break;
      }

      case 'subscription_resumed': {
        await handleSubscriptionResumed(event, userId);
        break;
      }

      case 'subscription_payment_success': {
        await handlePaymentSuccess(event, userId);
        break;
      }

      case 'subscription_payment_failed': {
        await handlePaymentFailed(event, userId);
        break;
      }

      case 'order_created': {
        // One-time purchase or first subscription payment
        await handleOrderCreated(event, userId);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}

async function handleSubscriptionUpdate(event: any, userId: string) {
  const subscription = event.data.attributes;
  const customerId = subscription.customer_id?.toString();
  const subscriptionId = event.data.id?.toString();

  if (!userId) {
    console.error('No user_id in webhook custom data');
    return;
  }

  const status = mapStatus(subscription.status);

  const { error } = await getSupabase()
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_customer_id: customerId, // Reusing field for LemonSqueezy customer ID
      stripe_subscription_id: subscriptionId, // Reusing field for LemonSqueezy subscription ID
      plan_type: 'pro',
      status: status,
      current_period_start: subscription.created_at,
      current_period_end: subscription.renews_at,
      cancel_at_period_end: subscription.cancelled,
      ai_analyses_limit: -1, // Unlimited for pro
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error updating subscription:', error);
  } else {
    console.log('Subscription updated for user:', userId);
  }
}

async function handleSubscriptionCanceled(event: any, userId: string) {
  if (!userId) return;

  const { error } = await getSupabase()
    .from('subscriptions')
    .update({
      plan_type: 'free',
      status: 'canceled',
      ai_analyses_limit: 10,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Error canceling subscription:', error);
  }
}

async function handleSubscriptionResumed(event: any, userId: string) {
  if (!userId) return;

  const { error } = await getSupabase()
    .from('subscriptions')
    .update({
      plan_type: 'pro',
      status: 'active',
      ai_analyses_limit: -1,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Error resuming subscription:', error);
  }
}

async function handlePaymentSuccess(event: any, userId: string) {
  if (!userId) return;

  // Reset AI usage on successful payment
  const { error } = await getSupabase()
    .from('subscriptions')
    .update({
      ai_analyses_used: 0,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Error resetting usage:', error);
  }
}

async function handlePaymentFailed(event: any, userId: string) {
  if (!userId) return;

  const { error } = await getSupabase()
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Error marking past due:', error);
  }
}

async function handleOrderCreated(event: any, userId: string) {
  // This handles the initial order - subscription_created will handle the rest
  console.log('Order created for user:', userId);
}

function mapStatus(lsStatus: string): string {
  const statusMap: Record<string, string> = {
    'active': 'active',
    'on_trial': 'trialing',
    'paused': 'paused',
    'past_due': 'past_due',
    'unpaid': 'past_due',
    'cancelled': 'canceled',
    'expired': 'canceled',
  };
  return statusMap[lsStatus] || 'active';
}

