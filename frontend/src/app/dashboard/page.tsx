'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useDashboard, useIndustries } from '@/lib/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SentimentCard } from '@/components/dashboard/sentiment-card';
import { NPSGauge } from '@/components/dashboard/nps-gauge';
import { AlertsCard } from '@/components/dashboard/alerts-card';
import { RefreshCw, Calendar, MessageSquare, Star, ThumbsUp, ThumbsDown } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [industry, setIndustry] = useState<string>('general');
  const { data: dashboard, isLoading, refetch, isFetching } = useDashboard(industry);
  const { data: industriesData } = useIndustries();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!dashboard) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Reviews Found</h2>
        <p className="text-muted-foreground max-w-md">
          We couldn&apos;t find any reviews for your store. Make sure your Judge.me integration is
          set up correctly.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Overview</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.shop_domain || 'Store Owner'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Industry" />
            </SelectTrigger>
            <SelectContent>
              {industriesData?.industries.map((ind) => (
                <SelectItem key={ind} value={ind}>
                  {ind.charAt(0).toUpperCase() + ind.slice(1)}
                </SelectItem>
              )) || <SelectItem value="general">General</SelectItem>}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
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
          Last analyzed: {new Date(dashboard.analysis_date).toLocaleString()}
        </span>
      </div>
    </div>
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
