'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  Check, 
  Sparkles, 
  Zap, 
  Crown, 
  CreditCard,
  ExternalLink,
  ArrowLeft,
  Loader2
} from 'lucide-react';

interface Subscription {
  plan_type: string;
  status: string;
  ai_analyses_used: number;
  ai_analyses_limit: number;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
}

export default function BillingPage() {
  const searchParams = useSearchParams();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const res = await fetch('/api/subscription');
      if (res.ok) {
        const data = await res.json();
        setSubscription(data.subscription);
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/lemonsqueezy/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: process.env.NEXT_PUBLIC_LEMONSQUEEZY_VARIANT_ID,
        }),
      });

      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      } else {
        alert('Failed to start checkout. Please try again.');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/lemonsqueezy/portal', {
        method: 'POST',
      });

      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      } else {
        alert('Failed to open billing portal. Please try again.');
      }
    } catch (err) {
      console.error('Portal error:', err);
      alert('Failed to open billing portal. Please try again.');
    } finally {
      setPortalLoading(false);
    }
  };

  const isPro = subscription?.plan_type === 'pro' || subscription?.plan_type === 'lifetime';

  if (loading) {
    return (
      <div className="min-h-screen bg-dashboard flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dashboard text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-[#232339]/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <a href="/" className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 w-fit">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Success/Cancel Messages */}
        {success && (
          <div className="mb-8 p-4 bg-emerald-950/50 border border-emerald-800 rounded-xl text-emerald-400 flex items-center gap-3">
            <Check className="w-5 h-5" />
            <span>Welcome to Pro! Your subscription is now active.</span>
          </div>
        )}
        {canceled && (
          <div className="mb-8 p-4 bg-amber-950/50 border border-amber-800 rounded-xl text-amber-400">
            Checkout was canceled. You can try again anytime.
          </div>
        )}

        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-2">Upgrade to Pro</h1>
          <p className="text-zinc-400">Unlock unlimited AI analysis and premium features</p>
        </div>

        {/* Current Plan Status */}
        {isPro && (
          <div className="mb-8 p-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Crown className="w-8 h-8 text-amber-400" />
                <div>
                  <h3 className="font-semibold text-lg">Pro Plan Active</h3>
                  <p className="text-zinc-400 text-sm">
                    {subscription?.cancel_at_period_end
                      ? `Cancels on ${new Date(subscription.current_period_end!).toLocaleDateString()}`
                      : `Renews on ${new Date(subscription?.current_period_end || '').toLocaleDateString()}`
                    }
                  </p>
                </div>
              </div>
              <Button
                onClick={handleManageBilling}
                disabled={portalLoading}
                variant="outline"
                className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
              >
                {portalLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-2" />
                )}
                Manage Billing
              </Button>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <div className={`p-6 rounded-2xl border ${!isPro ? 'border-indigo-500 bg-indigo-500/5' : 'border-zinc-800 bg-[#1a1a2e]'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Free</h3>
              {!isPro && (
                <span className="px-2 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-medium rounded">
                  Current
                </span>
              )}
            </div>
            <div className="mb-4">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-zinc-500">/month</span>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-zinc-400">
                <Check className="w-4 h-4 text-emerald-400" />
                Unlimited prompts
              </li>
              <li className="flex items-center gap-2 text-zinc-400">
                <Check className="w-4 h-4 text-emerald-400" />
                Unlimited collections
              </li>
              <li className="flex items-center gap-2 text-zinc-400">
                <Check className="w-4 h-4 text-emerald-400" />
                Browser extension
              </li>
              <li className="flex items-center gap-2 text-zinc-400">
                <Check className="w-4 h-4 text-emerald-400" />
                10 AI analyses/month
              </li>
              <li className="flex items-center gap-2 text-zinc-500">
                <span className="w-4 h-4 text-center">-</span>
                Shareable collections
              </li>
            </ul>
            {!isPro && (
              <div className="text-center text-sm text-zinc-500">
                {subscription?.ai_analyses_used || 0} / {subscription?.ai_analyses_limit || 10} AI analyses used
              </div>
            )}
          </div>

          {/* Pro Plan */}
          <div className={`p-6 rounded-2xl border-2 ${isPro ? 'border-amber-500 bg-amber-500/5' : 'border-zinc-700 bg-[#1a1a2e]'} relative`}>
            {!isPro && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> RECOMMENDED
                </span>
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                Pro
              </h3>
              {isPro && (
                <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs font-medium rounded">
                  Current
                </span>
              )}
            </div>
            <div className="mb-4">
              <span className="text-4xl font-bold">$9</span>
              <span className="text-zinc-500">/month</span>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-zinc-300">
                <Check className="w-4 h-4 text-emerald-400" />
                Everything in Free
              </li>
              <li className="flex items-center gap-2 text-zinc-300">
                <Check className="w-4 h-4 text-amber-400" />
                <strong>Unlimited</strong> AI analyses
              </li>
              <li className="flex items-center gap-2 text-zinc-300">
                <Check className="w-4 h-4 text-amber-400" />
                Shareable collections
              </li>
              <li className="flex items-center gap-2 text-zinc-300">
                <Check className="w-4 h-4 text-amber-400" />
                Priority support
              </li>
              <li className="flex items-center gap-2 text-zinc-300">
                <Check className="w-4 h-4 text-amber-400" />
                Early access to features
              </li>
            </ul>
            {!isPro && (
              <Button
                onClick={handleUpgrade}
                disabled={checkoutLoading}
                className="w-full btn-primary-gradient py-6 text-base"
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Upgrade to Pro
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="text-xl font-semibold mb-6 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4 max-w-2xl mx-auto">
            <div className="p-4 bg-[#1a1a2e] rounded-xl">
              <h4 className="font-medium mb-2">Can I cancel anytime?</h4>
              <p className="text-zinc-400 text-sm">
                Yes! You can cancel your subscription at any time. You'll keep Pro access until the end of your billing period.
              </p>
            </div>
            <div className="p-4 bg-[#1a1a2e] rounded-xl">
              <h4 className="font-medium mb-2">What payment methods do you accept?</h4>
              <p className="text-zinc-400 text-sm">
                We accept all major credit cards via Stripe. Your payment info is securely handled by Stripe.
              </p>
            </div>
            <div className="p-4 bg-[#1a1a2e] rounded-xl">
              <h4 className="font-medium mb-2">What happens to my prompts if I downgrade?</h4>
              <p className="text-zinc-400 text-sm">
                Your prompts are safe! You'll keep all your saved prompts. You'll just be limited to 10 AI analyses per month.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

