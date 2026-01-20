'use client';

import { useState } from 'react';
import { useSentiment, useIndustries } from '@/lib/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

const COLORS = {
  positive: '#22c55e',
  neutral: '#eab308',
  negative: '#ef4444',
};

export default function SentimentPage() {
  const [industry, setIndustry] = useState<string>('general');
  const { data: sentiment, isLoading } = useSentiment(industry);
  const { data: industriesData } = useIndustries();

  if (isLoading) {
    return <SentimentSkeleton />;
  }

  if (!sentiment) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">No sentiment data available</p>
      </div>
    );
  }

  const pieData = [
    { name: 'Positive', value: sentiment.overview.distribution.positive, color: COLORS.positive },
    { name: 'Neutral', value: sentiment.overview.distribution.neutral, color: COLORS.neutral },
    { name: 'Negative', value: sentiment.overview.distribution.negative, color: COLORS.negative },
  ];

  const barData = [
    {
      name: 'Positive',
      count: sentiment.overview.distribution.positive,
      percentage: sentiment.overview.positive_pct,
    },
    {
      name: 'Neutral',
      count: sentiment.overview.distribution.neutral,
      percentage: sentiment.overview.neutral_pct,
    },
    {
      name: 'Negative',
      count: sentiment.overview.distribution.negative,
      percentage: sentiment.overview.negative_pct,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sentiment Analysis</h1>
          <p className="text-muted-foreground">
            Detailed breakdown of customer sentiment across {sentiment.review_count.toLocaleString()}{' '}
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

      {/* Main Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <SentimentCard metrics={sentiment.overview} reviewCount={sentiment.review_count} />
        <NPSGauge
          score={sentiment.nps.nps_proxy}
          promoters={sentiment.nps.promoters}
          promotersPct={sentiment.nps.promoters_pct}
          passives={sentiment.nps.passives}
          passivesPct={sentiment.nps.passives_pct}
          detractors={sentiment.nps.detractors}
          detractorsPct={sentiment.nps.detractors_pct}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sentiment Distribution</CardTitle>
            <CardDescription>Visual breakdown by sentiment category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [Number(value).toLocaleString(), 'Reviews']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Review Counts by Sentiment</CardTitle>
            <CardDescription>Absolute numbers and percentages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical">
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip
                    formatter={(value, name) => {
                      const numValue = Number(value);
                      if (name === 'count') return [numValue.toLocaleString(), 'Reviews'];
                      return [`${numValue.toFixed(1)}%`, 'Percentage'];
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="count"
                    name="Reviews"
                    fill="#3b82f6"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <AlertsCard alerts={sentiment.alerts} />

      {/* Sentiment Score Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Understanding Sentiment Scores</CardTitle>
          <CardDescription>How we calculate and interpret sentiment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-green-500"></div>
                <span className="font-medium">Positive (≥ 0.05)</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Reviews expressing satisfaction, praise, or positive emotions about products or
                service.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-yellow-500"></div>
                <span className="font-medium">Neutral (-0.05 to 0.05)</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Reviews that are factual, balanced, or don&apos;t express strong positive or
                negative sentiment.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-red-500"></div>
                <span className="font-medium">Negative (&lt; -0.05)</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Reviews expressing dissatisfaction, complaints, or negative emotions about products
                or service.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SentimentSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
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
