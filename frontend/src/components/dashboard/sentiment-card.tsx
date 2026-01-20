'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { HelpCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { OverviewMetrics } from '@/lib/types';

interface SentimentCardProps {
  metrics: OverviewMetrics;
  reviewCount: number;
}

export function SentimentCard({ metrics, reviewCount }: SentimentCardProps) {
  const getSentimentColor = (sentiment: number) => {
    if (sentiment >= 0.3) return 'text-green-600';
    if (sentiment >= -0.3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSentimentIcon = (sentiment: number) => {
    if (sentiment >= 0.3) return TrendingUp;
    if (sentiment >= -0.3) return Minus;
    return TrendingDown;
  };

  const SentimentIcon = getSentimentIcon(metrics.avg_sentiment);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Overall Sentiment</CardTitle>
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>
                Sentiment score ranges from -1 (very negative) to +1 (very positive). Calculated
                using VADER sentiment analysis with e-commerce specific enhancements.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <CardDescription>Analysis of {reviewCount.toLocaleString()} reviews</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 mb-6">
          <SentimentIcon className={`h-8 w-8 ${getSentimentColor(metrics.avg_sentiment)}`} />
          <div>
            <span className={`text-3xl font-bold ${getSentimentColor(metrics.avg_sentiment)}`}>
              {metrics.avg_sentiment >= 0 ? '+' : ''}
              {metrics.avg_sentiment.toFixed(2)}
            </span>
            <p className="text-sm text-muted-foreground">Average score</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                Positive
              </span>
              <span className="font-medium">
                {metrics.distribution.positive.toLocaleString()} ({metrics.positive_pct.toFixed(1)}
                %)
              </span>
            </div>
            <Progress value={metrics.positive_pct} className="h-2 bg-muted [&>div]:bg-green-500" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
                Neutral
              </span>
              <span className="font-medium">
                {metrics.distribution.neutral.toLocaleString()} ({metrics.neutral_pct.toFixed(1)}%)
              </span>
            </div>
            <Progress value={metrics.neutral_pct} className="h-2 bg-muted [&>div]:bg-yellow-500" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500"></span>
                Negative
              </span>
              <span className="font-medium">
                {metrics.distribution.negative.toLocaleString()} ({metrics.negative_pct.toFixed(1)}
                %)
              </span>
            </div>
            <Progress value={metrics.negative_pct} className="h-2 bg-muted [&>div]:bg-red-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
