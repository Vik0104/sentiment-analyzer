import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type {
  DashboardResponse,
  SentimentResponse,
  AspectResponse,
  TopicsResponse,
  TrendsResponse,
  SubscriptionStatus,
  PlansResponse,
} from './types';

export function useDashboard(industry?: string, forceRefresh?: boolean) {
  return useQuery<DashboardResponse>({
    queryKey: ['dashboard', industry, forceRefresh],
    queryFn: () => api.getDashboard(industry, forceRefresh),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSentiment(industry?: string) {
  return useQuery<SentimentResponse>({
    queryKey: ['sentiment', industry],
    queryFn: () => api.getSentiment(industry),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAspects(industry?: string) {
  return useQuery<AspectResponse>({
    queryKey: ['aspects', industry],
    queryFn: () => api.getAspects(industry),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTopics() {
  return useQuery<TopicsResponse>({
    queryKey: ['topics'],
    queryFn: () => api.getTopics(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTrends() {
  return useQuery<TrendsResponse>({
    queryKey: ['trends'],
    queryFn: () => api.getTrends(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSubscriptionStatus() {
  return useQuery<SubscriptionStatus>({
    queryKey: ['subscription-status'],
    queryFn: () => api.getSubscriptionStatus(),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function usePlans() {
  return useQuery<PlansResponse>({
    queryKey: ['plans'],
    queryFn: () => api.getPlans(),
    staleTime: 60 * 60 * 1000, // 1 hour (plans don't change often)
  });
}

export function useIndustries() {
  return useQuery<{ industries: string[] }>({
    queryKey: ['industries'],
    queryFn: () => api.getIndustries(),
    staleTime: 60 * 60 * 1000,
  });
}
