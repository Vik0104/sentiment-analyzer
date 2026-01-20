'use client';

import { useTopics } from '@/lib/hooks';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Lock, Hash, MessageSquare, Layers } from 'lucide-react';

export default function TopicsPage() {
  const { user } = useAuth();
  const { data: topics, isLoading } = useTopics();

  // Check if user has access
  const hasAccess = user && ['starter', 'pro'].includes(user.subscription_tier);

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Lock className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Upgrade to Access Topics</h2>
        <p className="text-muted-foreground max-w-md mb-6">
          Topic extraction and keyword analysis are available on Starter and Pro plans. Upgrade to
          discover what your customers are talking about most.
        </p>
        <Button asChild>
          <Link href="/billing">Upgrade Now</Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return <TopicsSkeleton />;
  }

  if (!topics) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">No topic data available</p>
      </div>
    );
  }

  const keywordsChartData = topics.topics.keywords.slice(0, 15).map((kw) => ({
    keyword: kw.keyword,
    score: parseFloat((kw.score * 100).toFixed(1)),
  }));

  const bigramsChartData = topics.topics.bigrams.slice(0, 10).map((bg) => ({
    phrase: bg.phrase,
    count: bg.count,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Topic Analysis</h1>
        <p className="text-muted-foreground">
          Discover trending keywords and topics across {topics.review_count.toLocaleString()}{' '}
          reviews
        </p>
      </div>

      {/* Keywords Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Top Keywords
          </CardTitle>
          <CardDescription>Most important words mentioned in reviews</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={keywordsChartData} layout="vertical">
                <XAxis type="number" domain={[0, 100]} unit="%" />
                <YAxis
                  dataKey="keyword"
                  type="category"
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, 'Relevance Score']}
                />
                <Bar dataKey="score" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Word Cloud Alternative - Badge Display */}
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-sm font-medium mb-3">Quick View</h4>
            <div className="flex flex-wrap gap-2">
              {topics.topics.keywords.map((kw, index) => {
                const size =
                  index < 5 ? 'text-lg' : index < 10 ? 'text-base' : 'text-sm';
                const opacity = Math.max(0.5, 1 - index * 0.05);
                return (
                  <Badge
                    key={kw.keyword}
                    variant="secondary"
                    className={`${size}`}
                    style={{ opacity }}
                  >
                    {kw.keyword}
                  </Badge>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bigrams Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Common Phrases (Bigrams)
          </CardTitle>
          <CardDescription>Two-word phrases frequently used together</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bigramsChartData} layout="vertical">
                <XAxis type="number" />
                <YAxis
                  dataKey="phrase"
                  type="category"
                  width={120}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value) => [Number(value).toLocaleString(), 'Mentions']}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Topic Clusters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Topic Clusters
          </CardTitle>
          <CardDescription>
            Reviews grouped by similar themes using machine learning
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {topics.topics.clusters.map((cluster, index) => (
              <Card key={index} className="bg-muted/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{cluster.name}</CardTitle>
                    <Badge variant="outline">{cluster.document_count} reviews</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {cluster.words.map((word) => (
                      <Badge key={word} variant="secondary" className="text-xs">
                        {word}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Topic Insights</CardTitle>
          <CardDescription>What the data tells us</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topics.topics.keywords.length > 0 && (
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-blue-500 mt-2"></div>
                <div>
                  <p className="font-medium">
                    &quot;{topics.topics.keywords[0].keyword}&quot; is your top keyword
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This word appears most frequently and significantly in your reviews.
                  </p>
                </div>
              </div>
            )}
            {topics.topics.bigrams.length > 0 && (
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-purple-500 mt-2"></div>
                <div>
                  <p className="font-medium">
                    &quot;{topics.topics.bigrams[0].phrase}&quot; is the most common phrase
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Mentioned {topics.topics.bigrams[0].count} times across reviews.
                  </p>
                </div>
              </div>
            )}
            {topics.topics.clusters.length > 0 && (
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-green-500 mt-2"></div>
                <div>
                  <p className="font-medium">
                    {topics.topics.clusters.length} distinct topic clusters identified
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your reviews cover{' '}
                    {topics.topics.clusters.length === 1
                      ? 'one main theme'
                      : `${topics.topics.clusters.length} different themes`}
                    .
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TopicsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
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
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
