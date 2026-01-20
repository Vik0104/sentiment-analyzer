'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { DashboardResponse } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SentimentCard } from '@/components/dashboard/sentiment-card';
import { NPSGauge } from '@/components/dashboard/nps-gauge';
import { AlertsCard } from '@/components/dashboard/alerts-card';
import {
  RefreshCw,
  Calendar,
  MessageSquare,
  Star,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';

export default function DemoPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDemoData = async () => {
    try {
      setIsFetching(true);
      const data = await api.getDemoDashboard();
      setDashboard(data);
      setError(null);
    } catch (err) {
      setError('Failed to load demo data');
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchDemoData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <DemoHeader onConnect={() => router.push('/')} />
        <main className="container mx-auto px-4 py-8">
          <DashboardSkeleton />
        </main>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="min-h-screen bg-muted/30">
        <DemoHeader onConnect={() => router.push('/')} />
        <main className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center h-[50vh] text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Failed to Load Demo</h2>
            <p className="text-muted-foreground max-w-md mb-4">
              {error || 'Something went wrong loading the demo data.'}
            </p>
            <Button onClick={fetchDemoData}>Try Again</Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <DemoHeader onConnect={() => router.push('/')} />

      <main className="container mx-auto px-4 py-8">
        {/* Demo Banner */}
        <Alert className="mb-6 border-primary/50 bg-primary/5">
          <Info className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              You&apos;re viewing demo data. Connect your Judge.me store to see real analytics.
            </span>
            <Button size="sm" variant="outline" onClick={() => router.push('/')}>
              Connect Store
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">Dashboard Overview</h1>
                <Badge variant="secondary">Demo</Badge>
              </div>
              <p className="text-muted-foreground">
                Sample data from demo-store.myshopify.com
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={fetchDemoData}
                disabled={isFetching}
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard.review_count.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Analyzed in this period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Sentiment</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboard.overview.avg_sentiment >= 0 ? '+' : ''}
                  {dashboard.overview.avg_sentiment.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">Scale: -1 to +1</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Positive Reviews</CardTitle>
                <ThumbsUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {dashboard.overview.positive_pct.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {dashboard.overview.distribution.positive.toLocaleString()} reviews
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Negative Reviews</CardTitle>
                <ThumbsDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {dashboard.overview.negative_pct.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {dashboard.overview.distribution.negative.toLocaleString()} reviews
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            <SentimentCard metrics={dashboard.overview} reviewCount={dashboard.review_count} />
            <NPSGauge
              score={dashboard.nps.nps_proxy}
              promoters={dashboard.nps.promoters}
              promotersPct={dashboard.nps.promoters_pct}
              passives={dashboard.nps.passives}
              passivesPct={dashboard.nps.passives_pct}
              detractors={dashboard.nps.detractors}
              detractorsPct={dashboard.nps.detractors_pct}
            />
          </div>

          {/* Alerts */}
          <AlertsCard alerts={dashboard.alerts} />

          {/* Sample Reviews */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ThumbsUp className="h-5 w-5 text-green-600" />
                  Top Positive Reviews
                </CardTitle>
                <CardDescription>Highest sentiment scores</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {dashboard.sample_reviews.positive.slice(0, 3).map((review, index) => (
                  <div key={index} className="border-l-2 border-green-500 pl-4 py-2">
                    <p className="text-sm">&quot;{review.text}&quot;</p>
                    <Badge variant="secondary" className="mt-2">
                      Score: {review.score.toFixed(2)}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ThumbsDown className="h-5 w-5 text-red-600" />
                  Top Negative Reviews
                </CardTitle>
                <CardDescription>Lowest sentiment scores</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {dashboard.sample_reviews.negative.slice(0, 3).map((review, index) => (
                  <div key={index} className="border-l-2 border-red-500 pl-4 py-2">
                    <p className="text-sm">&quot;{review.text}&quot;</p>
                    <Badge variant="secondary" className="mt-2">
                      Score: {review.score.toFixed(2)}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Analysis Date */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              Demo data generated: {new Date(dashboard.analysis_date).toLocaleString()}
            </span>
          </div>

          {/* CTA */}
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="py-8 text-center">
              <h2 className="text-2xl font-bold mb-2">Ready to analyze your real reviews?</h2>
              <p className="text-primary-foreground/80 mb-6 max-w-xl mx-auto">
                Connect your Judge.me store and get instant insights from your actual customer reviews.
              </p>
              <Button size="lg" variant="secondary" onClick={() => router.push('/')}>
                Connect Your Store
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function DemoHeader({ onConnect }: { onConnect: () => void }) {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg">Sentiment Analyzer</span>
          <Badge variant="outline" className="ml-2">Demo</Badge>
        </div>
        <Button onClick={onConnect}>
          Connect Judge.me
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
