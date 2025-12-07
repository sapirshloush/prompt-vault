import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// CORS headers for extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// GET /api/subscription - Get current user's subscription
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get subscription
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !subscription) {
      // Create default free subscription
      const { data: newSub } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_type: 'free',
          status: 'active',
          ai_analyses_limit: 10,
          ai_analyses_used: 0,
        })
        .select()
        .single();

      return NextResponse.json({
        subscription: newSub || {
          plan_type: 'free',
          status: 'active',
          ai_analyses_limit: 10,
          ai_analyses_used: 0,
        },
        isPro: false,
        canUseAI: true,
        aiRemaining: 10,
      }, { headers: corsHeaders });
    }

    const isPro = subscription.plan_type === 'pro' || subscription.plan_type === 'lifetime';
    const aiRemaining = isPro ? -1 : Math.max(0, subscription.ai_analyses_limit - subscription.ai_analyses_used);
    const canUseAI = isPro || aiRemaining > 0;

    return NextResponse.json({
      subscription,
      isPro,
      canUseAI,
      aiRemaining,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500, headers: corsHeaders }
    );
  }
}

