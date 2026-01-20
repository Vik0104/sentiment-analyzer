'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useSubscriptionStatus } from '@/lib/hooks';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
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
  User,
  Store,
  CreditCard,
  Calendar,
  LogOut,
  Sparkles,
  ArrowLeft,
  ExternalLink,
  Shield,
  Mail,
} from 'lucide-react';
import { useState } from 'react';

const tierColors = {
  free: 'bg-muted text-muted-foreground',
  starter: 'bg-blue-100 text-blue-800',
  pro: 'bg-purple-100 text-purple-800',
};

export default function SettingsPage() {
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const { data: subscription, isLoading: subLoading } = useSubscriptionStatus();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    router.push('/');
  };

  const handleManageBilling = async () => {
    try {
      const { portal_url } = await api.createPortalSession(window.location.href);
      window.location.href = portal_url;
    } catch (error) {
      console.error('Failed to open billing portal:', error);
    }
  };

  if (authLoading || subLoading) {
    return <SettingsSkeleton />;
  }

  if (!user) {
    return null;
  }

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

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-2xl font-bold mb-6">Account Settings</h1>

        <div className="space-y-6">
          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>Your account details from Judge.me</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Shop Domain</span>
                </div>
                <span className="font-medium">{user.shop_domain}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Email</span>
                </div>
                <span className="font-medium">{user.email || 'Not provided'}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Member Since</span>
                </div>
                <span className="font-medium">
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Last Login</span>
                </div>
                <span className="font-medium">
                  {user.last_login
                    ? new Date(user.last_login).toLocaleDateString()
                    : 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Subscription */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscription
              </CardTitle>
              <CardDescription>Manage your subscription plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Plan</span>
                <Badge className={tierColors[user.subscription_tier]}>
                  {user.subscription_tier.charAt(0).toUpperCase() +
                    user.subscription_tier.slice(1)}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Reviews Used</span>
                <span className="font-medium">
                  {user.reviews_used.toLocaleString()} / {user.reviews_limit.toLocaleString()}
                </span>
              </div>
              {subscription && subscription.billing_period_end && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Current Period Ends</span>
                    <span className="font-medium">
                      {new Date(subscription.billing_period_end).toLocaleDateString()}
                    </span>
                  </div>
                </>
              )}
              {subscription?.cancel_at_period_end && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant="outline" className="text-yellow-600">
                      Cancels at period end
                    </Badge>
                  </div>
                </>
              )}
              <div className="flex gap-3 pt-2">
                {user.subscription_tier === 'free' ? (
                  <Button asChild className="flex-1">
                    <Link href="/billing">Upgrade Plan</Link>
                  </Button>
                ) : (
                  <Button variant="outline" className="flex-1" onClick={handleManageBilling}>
                    Manage Billing
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                )}
                <Button variant="outline" asChild>
                  <Link href="/billing">View Plans</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Judge.me Connection</p>
                  <p className="text-sm text-muted-foreground">
                    Your account is connected via Judge.me OAuth
                  </p>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Connected
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Sign Out</p>
                  <p className="text-sm text-muted-foreground">
                    Sign out of your account on this device
                  </p>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Sign out of your account?</DialogTitle>
                      <DialogDescription>
                        You will need to reconnect your Judge.me store to sign back in.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => {}}>
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                      >
                        {isLoggingOut ? 'Signing out...' : 'Sign Out'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Data & Privacy */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Data & Privacy</CardTitle>
              <CardDescription>How we handle your data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                We only access the review data you authorize through Judge.me. Your data is
                processed securely and used solely for providing sentiment analysis insights.
              </p>
              <p>
                Review data is cached temporarily to improve performance. Cached data is
                automatically deleted based on your subscription tier (7 days for Free, 30 days for
                Starter, unlimited for Pro).
              </p>
              <p>
                To delete your account and all associated data, please contact support.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-5 w-32" />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
