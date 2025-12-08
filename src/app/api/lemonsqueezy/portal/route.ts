import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { lemonSqueezySetup, getCustomer } from '@lemonsqueezy/lemonsqueezy.js';

// Initialize LemonSqueezy
lemonSqueezySetup({
  apiKey: process.env.LEMONSQUEEZY_API_KEY!,
  onError: (error) => console.error('LemonSqueezy Error:', error),
});

// Get customer portal URL
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's LemonSqueezy customer ID
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id') // Reused for LemonSqueezy customer ID
      .eq('user_id', user.id)
      .single();

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing account found' },
        { status: 404 }
      );
    }

    // Get customer details which includes portal URL
    const { data, error } = await getCustomer(subscription.stripe_customer_id);

    if (error || !data) {
      console.error('Error getting customer:', error);
      return NextResponse.json(
        { error: 'Failed to get billing portal' },
        { status: 500 }
      );
    }

    const portalUrl = data.data?.attributes?.urls?.customer_portal;

    if (!portalUrl) {
      return NextResponse.json(
        { error: 'Billing portal not available' },
        { status: 404 }
      );
    }

    return NextResponse.json({ url: portalUrl });
  } catch (error) {
    console.error('Portal error:', error);
    return NextResponse.json(
      { error: 'Failed to get billing portal' },
      { status: 500 }
    );
  }
}

