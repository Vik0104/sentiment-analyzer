'use client';

import { useTrends } from '@/lib/hooks';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  ReferenceLine,
} from 'recharts';
import {
  Lock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Activity,
  BarChart3,
  Zap,
} from 'lucide-react';

export default function TrendsPage() {
  const { user } = useAuth();
  const { data: trends, isLoading } = useTrends();

  // Check if user has access
  const hasAccess = user && ['starter', 'pro'].includes(user.subscription_tier);

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Lock className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Upgrade to Access Trends</h2>
        <p className="text-muted-foreground max-w-md mb-6">
          Trend analysis and anomaly detection are available on Starter and Pro plans. Track how
          sentiment changes over time.
        </p>
        <Button asChild>
          <Link href="/billing">Upgrade Now</Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return <TrendsSkeleton />;
  }

  if (!trends) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">No trend data available</p>
      </div>
    );
  }

  // Prepare chart data
  const chartData = trends.trends.periods.map((period, index) => ({
    date: new Date(period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    sentiment: parseFloat((trends.trends.sentiment[index] * 100).toFixed(1)),
    movingAvg: parseFloat((trends.trends.moving_avg[index] * 100).toFixed(1)),
    volume: trends.trends.volume[index],
  }));

  // Calculate trend direction
  const recentSentiment = trends.trends.sentiment.slice(-3);
  const avgRecent = recentSentiment.reduce((a, b) => a + b, 0) / recentSentiment.length;
  const olderSentiment = trends.trends.sentiment.slice(-6, -3);
  const avgOlder =
    olderSentiment.length > 0
      ? olderSentiment.reduce((a, b) => a + b, 0) / olderSentiment.length
      : avgRecent;
  const trendDirection = avgRecent > avgOlder ? 'up' : avgRecent < avgOlder ? 'down' : 'stable';

  // Calculate average sentiment
  const avgSentiment =
    trends.trends.sentiment.reduce((a, b) => a + b, 0) / trends.trends.sentiment.length;

  // Calculate total volume
  const totalVolume = trends.trends.volume.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Sentiment Trends</h1>
        <p className="text-muted-foreground">
          Track sentiment changes over time across {trends.review_count.toLocaleString()} reviews
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trend Direction</CardTitle>
            {trendDirection === 'up' ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : trendDirection === 'down' ? (
              <TrendingDown className="h-4 w-4 text-red-500" />
            ) : (
              <Activity className="h-4 w-4 text-yellow-500" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                trendDirection === 'up'
                  ? 'text-green-600'
                  : trendDirection === 'down'
                    ? 'text-red-600'
                    : 'text-yellow-600'
              }`}
            >
              {trendDirection === 'up'
                ? 'Improving'
                : trendDirection === 'down'
                  ? 'Declining'
                  : 'Stable'}
            </div>
            <p className="text-xs text-muted-foreground">Based on recent periods</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Sentiment</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgSentiment >= 0 ? '+' : ''}
              {(avgSentiment * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Across all periods</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anomalies Detected</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trends.anomalies.length}</div>
            <p className="text-xs text-muted-foreground">Unusual sentiment spikes</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sentiment Over Time</CardTitle>
          <CardDescription>Daily sentiment scores with moving average</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis
                  yAxisId="left"
                  domain={[-100, 100]}
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Sentiment %', angle: -90, position: 'insideLeft' }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Volume', angle: 90, position: 'insideRight' }}
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'volume') return [value, 'Reviews'];
                    return [`${value}%`, name === 'sentiment' ? 'Sentiment' : 'Moving Avg'];
                  }}
                />
                <Legend />
                <ReferenceLine yAxisId="left" y={0} stroke="#666" strokeDasharray="3 3" />
                <Bar
                  yAxisId="right"
                  dataKey="volume"
                  fill="#e5e7eb"
                  name="Volume"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="sentiment"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Sentiment"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="movingAvg"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Moving Avg"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Sentiment Area Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sentiment Range</CardTitle>
          <CardDescription>Visual representation of sentiment distribution over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={[-100, 100]} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [`${value}%`, 'Sentiment']} />
                <defs>
                  <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="sentiment"
                  stroke="#3b82f6"
                  fill="url(#sentimentGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Volume Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Review Volume</CardTitle>
          <CardDescription>Number of reviews received per period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [value, 'Reviews']} />
                <defs>
                  <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke="#22c55e"
                  fill="url(#volumeGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Anomalies */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Detected Anomalies
          </CardTitle>
          <CardDescription>
            Unusual sentiment spikes that may require attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trends.anomalies.length === 0 ? (
            <p className="text-muted-foreground py-4">
              No anomalies detected. Sentiment has been consistent.
            </p>
          ) : (
            <div className="space-y-3">
              {trends.anomalies.map((anomaly, index) => (
                <Alert
                  key={index}
                  variant={anomaly.type === 'negative_spike' ? 'destructive' : 'default'}
                >
                  {anomaly.type === 'positive_spike' ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <AlertTitle className="flex items-center gap-2">
                    {anomaly.type === 'positive_spike' ? 'Positive Spike' : 'Negative Spike'}
                    <Badge variant="outline">Z-score: {anomaly.z_score.toFixed(2)}</Badge>
                  </AlertTitle>
                  <AlertDescription>
                    {anomaly.type === 'positive_spike'
                      ? `Unusually high positive sentiment detected on ${new Date(anomaly.period).toLocaleDateString()}.`
                      : `Unusually high negative sentiment detected on ${new Date(anomaly.period).toLocaleDateString()}. Investigate potential issues.`}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trend Insights */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">Trend Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {trendDirection === 'up' && (
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Sentiment is improving</p>
                  <p className="text-sm text-muted-foreground">
                    Recent reviews show more positive sentiment than earlier periods. Keep up the
                    good work!
                  </p>
                </div>
              </div>
            )}
            {trendDirection === 'down' && (
              <div className="flex items-start gap-3">
                <TrendingDown className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <p className="font-medium">Sentiment is declining</p>
                  <p className="text-sm text-muted-foreground">
                    Recent reviews show more negative sentiment. Consider investigating recent
                    changes or issues.
                  </p>
                </div>
              </div>
            )}
            {trends.anomalies.filter((a) => a.type === 'negative_spike').length > 0 && (
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="font-medium">Negative spikes detected</p>
                  <p className="text-sm text-muted-foreground">
                    Review the dates with negative spikes to identify any specific issues that may
                    have caused customer dissatisfaction.
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Activity className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium">Total reviews analyzed: {totalVolume.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">
                  Across {trends.trends.periods.length} time periods
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TrendsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
