import type {
  LoginResponse,
  User,
  DashboardResponse,
  SentimentResponse,
  AspectResponse,
  TopicsResponse,
  TrendsResponse,
  SubscriptionStatus,
  PlansResponse,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Clear token and redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          window.location.href = '/';
        }
      }
      const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
      throw new Error(error.detail || `HTTP error ${response.status}`);
    }

    return response.json();
  }

  // Auth endpoints
  async getAuthorizationUrl(): Promise<{ authorization_url: string; state: string }> {
    return this.request('/auth/judgeme/authorize');
  }

  async handleCallback(code: string, state: string): Promise<LoginResponse> {
    return this.request(`/auth/judgeme/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.request<{ user: User }>('/auth/me');
    return response.user;
  }

  async logout(): Promise<void> {
    await this.request('/auth/logout', { method: 'POST' });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
    }
  }

  // Analysis endpoints
  async getDashboard(industry?: string, forceRefresh?: boolean): Promise<DashboardResponse> {
    const params = new URLSearchParams();
    if (industry) params.set('industry', industry);
    if (forceRefresh) params.set('force_refresh', 'true');
    const query = params.toString();
    return this.request(`/api/v1/analysis/dashboard${query ? `?${query}` : ''}`);
  }

  async getSentiment(industry?: string): Promise<SentimentResponse> {
    const params = new URLSearchParams();
    if (industry) params.set('industry', industry);
    const query = params.toString();
    return this.request(`/api/v1/analysis/sentiment${query ? `?${query}` : ''}`);
  }

  async getAspects(industry?: string): Promise<AspectResponse> {
    const params = new URLSearchParams();
    if (industry) params.set('industry', industry);
    const query = params.toString();
    return this.request(`/api/v1/analysis/aspects${query ? `?${query}` : ''}`);
  }

  async getTopics(): Promise<TopicsResponse> {
    return this.request('/api/v1/analysis/topics');
  }

  async getTrends(): Promise<TrendsResponse> {
    return this.request('/api/v1/analysis/trends');
  }

  async exportAnalysis(format: 'json' | 'csv'): Promise<Blob> {
    const token = this.getToken();
    const response = await fetch(`${this.baseUrl}/api/v1/analysis/export?format=${format}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error('Export failed');
    }
    return response.blob();
  }

  async getIndustries(): Promise<{ industries: string[] }> {
    return this.request('/api/v1/analysis/industries');
  }

  // Billing endpoints
  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    return this.request('/api/v1/billing/status');
  }

  async createCheckoutSession(
    plan: 'starter' | 'pro',
    successUrl: string,
    cancelUrl: string
  ): Promise<{ checkout_url: string }> {
    return this.request('/api/v1/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({
        plan,
        success_url: successUrl,
        cancel_url: cancelUrl,
      }),
    });
  }

  async createPortalSession(returnUrl: string): Promise<{ portal_url: string }> {
    return this.request('/api/v1/billing/portal', {
      method: 'POST',
      body: JSON.stringify({ return_url: returnUrl }),
    });
  }

  async getPlans(): Promise<PlansResponse> {
    return this.request('/api/v1/billing/plans');
  }

  async cancelSubscription(atPeriodEnd: boolean = true): Promise<{ message: string }> {
    return this.request(`/api/v1/billing/cancel?at_period_end=${atPeriodEnd}`, {
      method: 'POST',
    });
  }
}

export const api = new ApiClient(API_URL);
