'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import type { AlertItem } from '@/lib/types';

interface AlertsCardProps {
  alerts: AlertItem[];
}

export function AlertsCard({ alerts }: AlertsCardProps) {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Alerts</CardTitle>
          <CardDescription>Issues that need your attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-muted-foreground py-4">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>No alerts at this time. Everything looks good!</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Alerts</CardTitle>
        <CardDescription>
          {alerts.length} issue{alerts.length !== 1 ? 's' : ''} need{alerts.length === 1 ? 's' : ''}{' '}
          your attention
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert, index) => (
          <Alert key={index} variant={alert.type === 'critical' ? 'destructive' : 'default'}>
            {alert.type === 'critical' ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <AlertTitle className="capitalize">{alert.type}</AlertTitle>
            <AlertDescription>{alert.message}</AlertDescription>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
}
