// API Response Types

export interface User {
  id: string;
  shop_domain: string;
  email: string | null;
  created_at: string;
  last_login: string | null;
  subscription_tier: 'free' | 'starter' | 'pro';
  reviews_limit: number;
  reviews_used: number;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface OverviewMetrics {
  avg_sentiment: number;
  positive_pct: number;
  negative_pct: number;
  neutral_pct: number;
  distribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

export interface NPSMetrics {
  nps_proxy: number;
  promoters: number;
  promoters_pct: number;
  passives: number;
  passives_pct: number;
  detractors: number;
  detractors_pct: number;
  total: number;
}

export interface KeywordItem {
  keyword: string;
  score: number;
}

export interface BigramItem {
  phrase: string;
  count: number;
}

export interface TopicCluster {
  name: string;
  words: string[];
  document_count: number;
}

export interface TopicsResult {
  keywords: KeywordItem[];
  bigrams: BigramItem[];
  clusters: TopicCluster[];
}

export interface AspectItem {
  aspect: string;
  aspect_key: string;
  avg_sentiment: number;
  mentions: number;
  reviews_with_aspect: number;
  positive_pct: number;
  negative_pct: number;
}

export interface PainPointItem {
  aspect: string;
  negative_mentions: number;
  avg_score: number;
  examples: string[];
}

export interface KeyDriverItem {
  aspect: string;
  avg_sentiment: number;
  mention_count: number;
  impact_score: number;
  priority: 'fix_now' | 'maintain' | 'monitor' | 'deprioritize';
}

export interface TrendsResult {
  periods: string[];
  sentiment: number[];
  moving_avg: number[];
  volume: number[];
}

export interface AnomalyItem {
  period: string;
  type: 'positive_spike' | 'negative_spike';
  z_score: number;
}

export interface AlertItem {
  type: 'critical' | 'warning';
  message: string;
  metric: string;
  value: number;
}

export interface SampleReview {
  text: string;
  score: number;
}

export interface DashboardResponse {
  shop_domain: string;
  analysis_date: string;
  review_count: number;
  overview: OverviewMetrics;
  nps: NPSMetrics;
  topics: TopicsResult;
  aspects: AspectItem[];
  pain_points: PainPointItem[];
  key_drivers: KeyDriverItem[];
  trends: TrendsResult;
  anomalies: AnomalyItem[];
  alerts: AlertItem[];
  sample_reviews: {
    positive: SampleReview[];
    negative: SampleReview[];
  };
}

export interface SentimentResponse {
  shop_domain: string;
  review_count: number;
  overview: OverviewMetrics;
  nps: NPSMetrics;
  alerts: AlertItem[];
}

export interface AspectResponse {
  shop_domain: string;
  review_count: number;
  aspects: AspectItem[];
  pain_points: PainPointItem[];
  key_drivers: KeyDriverItem[];
}

export interface TopicsResponse {
  shop_domain: string;
  review_count: number;
  topics: TopicsResult;
}

export interface TrendsResponse {
  shop_domain: string;
  review_count: number;
  trends: TrendsResult;
  anomalies: AnomalyItem[];
}

export interface SubscriptionStatus {
  plan_tier: 'free' | 'starter' | 'pro';
  status: 'active' | 'cancelled' | 'cancelling' | 'paused' | 'halted' | 'payment_failed';
  reviews_limit: number;
  reviews_used: number;
  reviews_remaining: number;
  billing_period_start: string | null;
  billing_period_end: string | null;
  cancel_at_period_end: boolean;
}

export interface PlanFeature {
  name: string;
  tier: 'free' | 'starter' | 'pro';
  price_monthly: number;
  reviews_limit: number;
  features: string[];
}

export interface PlansResponse {
  plans: PlanFeature[];
}
