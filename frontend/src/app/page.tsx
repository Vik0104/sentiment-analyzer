'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  BarChart3,
  TrendingUp,
  MessageSquareText,
  Target,
  Sparkles,
  ArrowRight,
  Check,
  Star,
} from 'lucide-react';

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [shopDomain, setShopDomain] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleConnectJudgeMe = () => {
    setShowConnectDialog(true);
    setConnectError(null);
  };

  const handleSubmitShopDomain = async (e: React.FormEvent) => {
    e.preventDefault();

    // Normalize shop domain
    let normalizedDomain = shopDomain.trim().toLowerCase();

    // Remove protocol if present
    normalizedDomain = normalizedDomain.replace(/^https?:\/\//, '');

    // Remove trailing slash
    normalizedDomain = normalizedDomain.replace(/\/$/, '');

    if (!normalizedDomain) {
      setConnectError('Please enter your shop domain');
      return;
    }

    setIsConnecting(true);
    setConnectError(null);

    try {
      const { authorization_url } = await api.getAuthorizationUrl(normalizedDomain);
      window.location.href = authorization_url;
    } catch (error) {
      console.error('Failed to get authorization URL:', error);
      setConnectError('Failed to connect. Please check your shop domain and try again.');
      setIsConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const features = [
    {
      icon: BarChart3,
      title: 'Sentiment Analysis',
      description: 'Understand customer emotions with AI-powered sentiment scoring of every review.',
    },
    {
      icon: MessageSquareText,
      title: 'Topic Extraction',
      description: 'Automatically discover what customers talk about most with keyword and topic clustering.',
    },
    {
      icon: Target,
      title: 'Aspect Analysis',
      description: 'Break down sentiment by product aspects like quality, shipping, and customer service.',
    },
    {
      icon: TrendingUp,
      title: 'Trend Detection',
      description: 'Track sentiment over time and get alerted to anomalies before they become problems.',
    },
  ];

  const plans = [
    {
      name: 'Free',
      price: '₹0',
      priceUSD: '$0',
      tier: 'free' as const,
      description: 'Get started with basic analysis',
      features: ['Up to 100 reviews/month', 'Basic sentiment analysis', 'NPS proxy score', '7-day analysis history'],
      cta: 'Get Started',
      highlighted: false,
    },
    {
      name: 'Starter',
      price: '₹1,499',
      priceUSD: '$19',
      tier: 'starter' as const,
      description: 'Perfect for growing stores',
      features: [
        'Up to 1,000 reviews/month',
        'Topic extraction',
        'Aspect-based analysis',
        'Trend analysis',
        '30-day history',
      ],
      cta: 'Subscribe Now',
      highlighted: true,
    },
    {
      name: 'Pro',
      price: '₹3,999',
      priceUSD: '$49',
      tier: 'pro' as const,
      description: 'For high-volume sellers',
      features: [
        'Up to 10,000 reviews/month',
        'CSV/JSON export',
        'API access',
        'Priority processing',
        'Unlimited history',
      ],
      cta: 'Subscribe Now',
      highlighted: false,
    },
  ];

  const handlePlanSelect = (tier: 'free' | 'starter' | 'pro') => {
    if (tier === 'free') {
      handleConnectJudgeMe();
    } else {
      // For paid plans, user needs to connect first, then upgrade from dashboard
      handleConnectJudgeMe();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Sentiment Analyzer</span>
          </div>
          <Button onClick={handleConnectJudgeMe}>
            Connect Judge.me
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 text-center">
        <Badge variant="secondary" className="mb-4">
          <Star className="h-3 w-3 mr-1" />
          Built for Judge.me Stores
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          Turn Reviews Into
          <span className="text-primary block">Actionable Insights</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          AI-powered sentiment analysis for your Judge.me product reviews. Understand customer
          emotions, discover trending topics, and identify areas for improvement.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" onClick={handleConnectJudgeMe}>
            Connect Your Store
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => router.push('/demo')}>
            View Demo
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Everything You Need to Understand Your Customers</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Our AI analyzes your reviews in real-time, giving you insights that would take hours to
            gather manually.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <feature.icon className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-muted-foreground">Start free, upgrade when you need more. Powered by Razorpay.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative ${plan.highlighted ? 'border-primary shadow-lg scale-105' : ''}`}
            >
              {plan.highlighted && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most Popular</Badge>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                {plan.tier !== 'free' && (
                  <p className="text-xs text-muted-foreground">({plan.priceUSD} USD)</p>
                )}
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.highlighted ? 'default' : 'outline'}
                  onClick={() => handlePlanSelect(plan.tier)}
                >
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-24">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="py-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Understand Your Customers Better?</h2>
            <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              Connect your Judge.me store and start analyzing reviews in minutes. No credit card
              required for the free plan.
            </p>
            <Button size="lg" variant="secondary" onClick={handleConnectJudgeMe}>
              Connect Judge.me Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-semibold">Sentiment Analyzer</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Sentiment Analyzer. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Connect Shop Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Your Store</DialogTitle>
            <DialogDescription>
              Enter your Shopify store domain to connect with Judge.me
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitShopDomain} className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="yourstore.myshopify.com"
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
                disabled={isConnecting}
              />
              {connectError && (
                <p className="text-sm text-destructive">{connectError}</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowConnectDialog(false)}
                disabled={isConnecting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isConnecting} className="flex-1">
                {isConnecting ? 'Connecting...' : 'Connect'}
                {!isConnecting && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
