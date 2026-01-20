'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { usePlans, useSubscriptionStatus } from '@/lib/hooks';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import Link from 'next/link';
import {
  Check,
  Sparkles,
  ArrowLeft,
  Crown,
  Zap,
  Star,
  ExternalLink,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Suspense } from 'react';

const tierIcons = {
  free: Star,
  starter: Zap,
  pro: Crown,
};

const tierColors = {
  free: 'border-muted',
  starter: 'border-blue-500',
  pro: 'border-purple-500',
};

function BillingContent() {
  const { user, isLoading: authLoading, isAuthenticated, refreshUser } = useAuth();
  const { data: plans, isLoading: plansLoading } = usePlans();
  const { data: subscription, isLoading: subLoading, refetch: refetchSub } = useSubscriptionStatus();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, router]);

  // Handle success/cancel from Stripe
  useEffect(() => {
    const success = searchParams.get('success');
    const cancelled = searchParams.get('cancelled');

    if (success === 'true') {
      setShowSuccess(true);
      refreshUser();
      refetchSub();
      // Clear the URL params
      router.replace('/billing');
    } else if (cancelled === 'true') {
      setShowCancelled(true);
      router.replace('/billing');
    }
  }, [searchParams, refreshUser, refetchSub, router]);

  const handleUpgrade = async (plan: 'starter' | 'pro') => {
    setIsProcessing(true);
    try {
      const { checkout_url } = await api.createCheckoutSession(
        plan,
        `${window.location.origin}/billing?success=true`,
        `${window.location.origin}/billing?cancelled=true`
      );
      window.location.href = checkout_url;
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      setIsProcessing(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      const { portal_url } = await api.createPortalSession(window.location.href);
      window.location.href = portal_url;
    } catch (error) {
      console.error('Failed to open billing portal:', error);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      await api.cancelSubscription(true);
      refetchSub();
      refreshUser();
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
    }
  };

  if (authLoading || plansLoading || subLoading) {
    return <BillingSkeleton />;
  }

  if (!user || !plans) {
    return null;
  }

  const currentTierIndex = ['free', 'starter', 'pro'].indexOf(user.subscription_tier);
  const usagePercent = (user.reviews_used / user.reviews_limit) * 100;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold">Sentiment Analyzer</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="text-2xl font-bold mb-2">Billing & Plans</h1>
        <p className="text-muted-foreground mb-8">
          Manage your subscription and view available plans
        </p>

        {/* Success Alert */}
        {showSuccess && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Payment Successful!</AlertTitle>
            <AlertDescription className="text-green-700">
              Your subscription has been upgraded. Enjoy your new features!
            </AlertDescription>
          </Alert>
        )}

        {/* Cancelled Alert */}
        {showCancelled && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Checkout Cancelled</AlertTitle>
            <AlertDescription>
              Your checkout was cancelled. No charges were made.
            </AlertDescription>
          </Alert>
        )}

        {/* Current Usage */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Current Usage</CardTitle>
            <CardDescription>
              Your review analysis usage this billing period
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Plan</span>
              <Badge
                className={
                  user.subscription_tier === 'pro'
                    ? 'bg-purple-100 text-purple-800'
                    : user.subscription_tier === 'starter'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-muted text-muted-foreground'
                }
              >
                {user.subscription_tier.charAt(0).toUpperCase() + user.subscription_tier.slice(1)}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Reviews Analyzed</span>
                <span className="font-medium">
                  {user.reviews_used.toLocaleString()} / {user.reviews_limit.toLocaleString()}
                </span>
              </div>
              <Progress value={usagePercent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {user.reviews_limit - user.reviews_used > 0
                  ? `${(user.reviews_limit - user.reviews_used).toLocaleString()} reviews remaining`
                  : 'You have reached your review limit'}
              </p>
            </div>
            {subscription && subscription.billing_period_end && (
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-muted-foreground">Billing Period Ends</span>
                <span className="text-sm font-medium">
                  {new Date(subscription.billing_period_end).toLocaleDateString()}
                </span>
              </div>
            )}
            {subscription?.cancel_at_period_end && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Subscription Cancelling</AlertTitle>
                <AlertDescription>
                  Your subscription will be cancelled at the end of the current billing period.
                  You can resubscribe anytime.
                </AlertDescription>
              </Alert>
            )}
            {user.subscription_tier !== 'free' && (
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={handleManageBilling}>
                  Manage Billing
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
                {!subscription?.cancel_at_period_end && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" className="text-destructive">
                        Cancel Subscription
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Cancel your subscription?</DialogTitle>
                        <DialogDescription>
                          Your subscription will remain active until the end of your current
                          billing period. After that, you&apos;ll be downgraded to the Free plan.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline">Keep Subscription</Button>
                        <Button variant="destructive" onClick={handleCancelSubscription}>
                          Cancel at Period End
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plans */}
        <h2 className="text-xl font-semibold mb-4">Available Plans</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.plans.map((plan, index) => {
            const TierIcon = tierIcons[plan.tier];
            const isCurrentPlan = user.subscription_tier === plan.tier;
            const canUpgrade = index > currentTierIndex;
            const canDowngrade = index < currentTierIndex;

            return (
              <Card
                key={plan.tier}
                className={`relative ${isCurrentPlan ? 'border-2 ' + tierColors[plan.tier] : ''}`}
              >
                {isCurrentPlan && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    Current Plan
                  </Badge>
                )}
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TierIcon
                      className={`h-5 w-5 ${
                        plan.tier === 'pro'
                          ? 'text-purple-500'
                          : plan.tier === 'starter'
                            ? 'text-blue-500'
                            : 'text-muted-foreground'
                      }`}
                    />
                    <CardTitle>{plan.name}</CardTitle>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">${plan.price_monthly}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <CardDescription>
                    Up to {plan.reviews_limit.toLocaleString()} reviews/month
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {isCurrentPlan ? (
                    <Button className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : canUpgrade ? (
                    <Button
                      className="w-full"
                      onClick={() => handleUpgrade(plan.tier as 'starter' | 'pro')}
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Processing...' : `Upgrade to ${plan.name}`}
                    </Button>
                  ) : canDowngrade ? (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={handleManageBilling}
                    >
                      Downgrade via Portal
                    </Button>
                  ) : (
                    <Button className="w-full" variant="outline" disabled>
                      {plan.name}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-1">What happens if I exceed my review limit?</h4>
              <p className="text-sm text-muted-foreground">
                You won&apos;t be able to analyze new reviews until your next billing period or
                until you upgrade your plan. Existing analyses remain accessible.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Can I change plans at any time?</h4>
              <p className="text-sm text-muted-foreground">
                Yes! Upgrades take effect immediately with prorated billing. Downgrades take effect
                at the end of your current billing period.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">What payment methods do you accept?</h4>
              <p className="text-sm text-muted-foreground">
                We accept all major credit cards through Stripe, including Visa, Mastercard,
                American Express, and Discover.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Is there a free trial?</h4>
              <p className="text-sm text-muted-foreground">
                The Free plan lets you try basic sentiment analysis with up to 100 reviews/month.
                No credit card required.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<BillingSkeleton />}>
      <BillingContent />
    </Suspense>
  );
}

function BillingSkeleton() {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-5 w-32" />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64 mb-8" />
        <Card className="mb-8">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="grid md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-10 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
