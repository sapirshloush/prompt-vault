import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { lemonSqueezySetup, createCheckout } from '@lemonsqueezy/lemonsqueezy.js';

// Initialize LemonSqueezy
lemonSqueezySetup({
  apiKey: process.env.LEMONSQUEEZY_API_KEY!,
  onError: (error) => console.error('LemonSqueezy Error:', error),
});

// Create a LemonSqueezy checkout session
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { variantId } = await request.json();
    const storeId = process.env.LEMONSQUEEZY_STORE_ID!;

    if (!variantId) {
      return NextResponse.json({ error: 'Variant ID is required' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://prompt-vault-ebon-psi.vercel.app';

    // Create checkout
    const { data, error } = await createCheckout(storeId, variantId, {
      checkoutData: {
        email: user.email || undefined,
        custom: {
          user_id: user.id,
        },
      },
      checkoutOptions: {
        embed: false,
        media: false,
        logo: true,
      },
      productOptions: {
        enabledVariants: [parseInt(variantId)],
        redirectUrl: `${baseUrl}/billing?success=true`,
        receiptButtonText: 'Go to Dashboard',
        receiptLinkUrl: `${baseUrl}/billing`,
      },
    });

    if (error) {
      console.error('LemonSqueezy checkout error:', error);
      return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 });
    }

    return NextResponse.json({ url: data?.data?.attributes?.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

