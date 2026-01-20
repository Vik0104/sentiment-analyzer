'use client';

import { useState } from 'react';
import { useAspects, useIndustries } from '@/lib/hooks';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  Lock,
  Target,
  AlertTriangle,
  TrendingUp,
  HelpCircle,
  ThumbsDown,
  ArrowRight,
  Wrench,
  Shield,
  Eye,
  MinusCircle,
} from 'lucide-react';
import type { KeyDriverItem } from '@/lib/types';

const priorityConfig: Record<
  string,
  { label: string; color: string; icon: React.ElementType; description: string }
> = {
  fix_now: {
    label: 'Fix Now',
    color: 'bg-red-100 text-red-800',
    icon: Wrench,
    description: 'High impact, low satisfaction - urgent attention needed',
  },
  maintain: {
    label: 'Maintain',
    color: 'bg-green-100 text-green-800',
    icon: Shield,
    description: 'High impact, high satisfaction - keep doing well',
  },
  monitor: {
    label: 'Monitor',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Eye,
    description: 'Lower impact but watch for changes',
  },
  deprioritize: {
    label: 'Deprioritize',
    color: 'bg-gray-100 text-gray-800',
    icon: MinusCircle,
    description: 'Lower impact, lower priority',
  },
};

export default function AspectsPage() {
  const { user } = useAuth();
  const [industry, setIndustry] = useState<string>('general');
  const { data: aspects, isLoading } = useAspects(industry);
  const { data: industriesData } = useIndustries();

  // Check if user has access
  const hasAccess = user && ['starter', 'pro'].includes(user.subscription_tier);

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Lock className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Upgrade to Access Aspect Analysis</h2>
        <p className="text-muted-foreground max-w-md mb-6">
          Aspect-based sentiment analysis is available on Starter and Pro plans. Understand how
          customers feel about specific aspects of your products.
        </p>
        <Button asChild>
          <Link href="/billing">Upgrade Now</Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return <AspectsSkeleton />;
  }

  if (!aspects) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">No aspect data available</p>
      </div>
    );
  }

  const aspectChartData = aspects.aspects.map((aspect) => ({
    aspect: aspect.aspect,
    sentiment: parseFloat((aspect.avg_sentiment * 100).toFixed(1)),
    mentions: aspect.mentions,
    positive: aspect.positive_pct,
    negative: aspect.negative_pct,
  }));

  const radarData = aspects.aspects.slice(0, 8).map((aspect) => ({
    aspect: aspect.aspect,
    sentiment: Math.round((aspect.avg_sentiment + 1) * 50), // Normalize to 0-100
    fullMark: 100,
  }));

  const getSentimentColor = (sentiment: number) => {
    if (sentiment >= 0.3) return '#22c55e';
    if (sentiment >= -0.3) return '#eab308';
    return '#ef4444';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Aspect Analysis</h1>
          <p className="text-muted-foreground">
            Sentiment breakdown by product aspects across {aspects.review_count.toLocaleString()}{' '}
            reviews
          </p>
        </div>
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
      </div>

      {/* Aspect Sentiment Overview */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              Aspect Sentiment Scores
            </CardTitle>
            <CardDescription>Average sentiment by aspect (-100 to +100)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aspectChartData} layout="vertical">
                  <XAxis type="number" domain={[-100, 100]} />
                  <YAxis
                    dataKey="aspect"
                    type="category"
                    width={100}
                    tick={{ fontSize: 12 }}
                  />
                  <RechartsTooltip
                    formatter={(value) => [`${value}%`, 'Sentiment']}
                    labelFormatter={(label) => `Aspect: ${label}`}
                  />
                  <Bar dataKey="sentiment" radius={[0, 4, 4, 0]}>
                    {aspectChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getSentimentColor(entry.sentiment / 100)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Radar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Aspect Radar</CardTitle>
            <CardDescription>Multi-dimensional view of aspect performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="aspect" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar
                    name="Sentiment"
                    dataKey="sentiment"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.5}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aspect Details Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detailed Aspect Breakdown</CardTitle>
          <CardDescription>
            Click on an aspect to see more details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {aspects.aspects.map((aspect) => (
              <div
                key={aspect.aspect_key}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{aspect.aspect}</span>
                    <Badge variant="outline">{aspect.mentions} mentions</Badge>
                  </div>
                  <span
                    className={`font-bold ${
                      aspect.avg_sentiment >= 0.3
                        ? 'text-green-600'
                        : aspect.avg_sentiment >= -0.3
                          ? 'text-yellow-600'
                          : 'text-red-600'
                    }`}
                  >
                    {aspect.avg_sentiment >= 0 ? '+' : ''}
                    {(aspect.avg_sentiment * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Positive</span>
                      <span className="text-green-600">{aspect.positive_pct.toFixed(1)}%</span>
                    </div>
                    <Progress
                      value={aspect.positive_pct}
                      className="h-2 [&>div]:bg-green-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Negative</span>
                      <span className="text-red-600">{aspect.negative_pct.toFixed(1)}%</span>
                    </div>
                    <Progress
                      value={aspect.negative_pct}
                      className="h-2 [&>div]:bg-red-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pain Points */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Pain Points
          </CardTitle>
          <CardDescription>
            Areas with the most negative feedback - focus here for improvements
          </CardDescription>
        </CardHeader>
        <CardContent>
          {aspects.pain_points.length === 0 ? (
            <p className="text-muted-foreground py-4">
              No significant pain points detected. Great job!
            </p>
          ) : (
            <div className="space-y-4">
              {aspects.pain_points.map((point, index) => (
                <div key={index} className="border-l-4 border-red-500 pl-4 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{point.aspect}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">
                        {point.negative_mentions} negative mentions
                      </Badge>
                      <span className="text-red-600 font-medium">
                        {(point.avg_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground mb-2">Sample complaints:</p>
                    {point.examples.slice(0, 2).map((example, i) => (
                      <p key={i} className="text-sm italic text-muted-foreground">
                        &quot;{example}&quot;
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Drivers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Key Drivers
              </CardTitle>
              <CardDescription>
                Aspects that have the biggest impact on overall satisfaction
              </CardDescription>
            </div>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Key drivers are calculated by correlating aspect sentiment with overall review
                  sentiment. Higher impact means this aspect more strongly influences customer
                  satisfaction.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {aspects.key_drivers.map((driver, index) => {
              const config = priorityConfig[driver.priority];
              const Icon = config?.icon || Target;
              return (
                <div
                  key={index}
                  className="border rounded-lg p-4 flex items-start gap-4"
                >
                  <div
                    className={`p-2 rounded-lg ${config?.color || 'bg-gray-100'}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{driver.aspect}</span>
                      <Badge variant="outline">{config?.label || driver.priority}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 text-sm text-muted-foreground">
                      <span>Sentiment: {(driver.avg_sentiment * 100).toFixed(0)}%</span>
                      <span>Mentions: {driver.mention_count}</span>
                      <span>Impact: {(driver.impact_score * 100).toFixed(0)}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {config?.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Action Items */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">Recommended Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {aspects.key_drivers
              .filter((d) => d.priority === 'fix_now')
              .slice(0, 3)
              .map((driver, index) => (
                <div key={index} className="flex items-center gap-3">
                  <ArrowRight className="h-4 w-4 text-red-500" />
                  <span>
                    Investigate and address issues with <strong>{driver.aspect}</strong> - high
                    impact area with low satisfaction
                  </span>
                </div>
              ))}
            {aspects.key_drivers
              .filter((d) => d.priority === 'maintain')
              .slice(0, 2)
              .map((driver, index) => (
                <div key={index} className="flex items-center gap-3">
                  <ArrowRight className="h-4 w-4 text-green-500" />
                  <span>
                    Continue excellent work on <strong>{driver.aspect}</strong> - this drives
                    customer satisfaction
                  </span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AspectsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
