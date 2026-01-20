'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Sparkles, AlertCircle, ArrowRight } from 'lucide-react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError(`OAuth error: ${errorParam}`);
        setIsProcessing(false);
        return;
      }

      if (!code || !state) {
        setError('Missing authorization code or state parameter');
        setIsProcessing(false);
        return;
      }

      try {
        const response = await api.handleCallback(code, state);
        login(response.access_token, response.user);
        router.push('/dashboard');
      } catch (err) {
        console.error('Callback error:', err);
        setError(err instanceof Error ? err.message : 'Failed to complete authentication');
        setIsProcessing(false);
      }
    };

    handleCallback();
  }, [searchParams, login, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Authentication Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="flex flex-col gap-3">
              <Button onClick={() => router.push('/')}>
                Try Again
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => router.push('/')}>
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <Card className="max-w-md w-full">
        <CardContent className="py-12 text-center">
          <div className="animate-pulse mb-6">
            <Sparkles className="h-12 w-12 text-primary mx-auto" />
          </div>
          <h2 className="text-xl font-semibold mb-2">
            {isProcessing ? 'Connecting Your Store...' : 'Redirecting...'}
          </h2>
          <p className="text-muted-foreground">
            {isProcessing
              ? 'Please wait while we set up your account.'
              : 'Taking you to your dashboard.'}
          </p>
          <div className="mt-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-muted/30">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
