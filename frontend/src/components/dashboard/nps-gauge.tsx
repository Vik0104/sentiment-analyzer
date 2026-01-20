'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

interface NPSGaugeProps {
  score: number;
  promoters: number;
  promotersPct: number;
  passives: number;
  passivesPct: number;
  detractors: number;
  detractorsPct: number;
}

export function NPSGauge({
  score,
  promoters,
  promotersPct,
  passives,
  passivesPct,
  detractors,
  detractorsPct,
}: NPSGaugeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height - 20;
    const radius = Math.min(width, height) - 40;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background arc (gray)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 20;
    ctx.stroke();

    // Draw gradient arc
    const gradient = ctx.createLinearGradient(0, centerY, width, centerY);
    gradient.addColorStop(0, '#ef4444'); // Red
    gradient.addColorStop(0.5, '#fbbf24'); // Yellow
    gradient.addColorStop(1, '#22c55e'); // Green

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 20;
    ctx.stroke();

    // Calculate needle angle (-100 to 100 maps to PI to 2*PI)
    const normalizedScore = (score + 100) / 200; // 0 to 1
    const angle = Math.PI + normalizedScore * Math.PI;

    // Draw needle
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + Math.cos(angle) * (radius - 30),
      centerY + Math.sin(angle) * (radius - 30)
    );
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 10, 0, 2 * Math.PI);
    ctx.fillStyle = '#1f2937';
    ctx.fill();

    // Draw labels
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'center';
    ctx.fillText('-100', 30, centerY + 5);
    ctx.fillText('0', centerX, 30);
    ctx.fillText('100', width - 30, centerY + 5);
  }, [score]);

  const getScoreColor = (score: number) => {
    if (score >= 50) return 'text-green-600';
    if (score >= 0) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 70) return 'Excellent';
    if (score >= 50) return 'Great';
    if (score >= 30) return 'Good';
    if (score >= 0) return 'Needs Work';
    return 'Critical';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">NPS Proxy Score</CardTitle>
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>
                NPS Proxy is calculated from sentiment scores. Reviews with sentiment &gt;0.5 are
                Promoters, &lt;-0.3 are Detractors, others are Passives.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <CardDescription>Based on sentiment analysis of your reviews</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <canvas ref={canvasRef} width={300} height={180} className="mx-auto" />
          <div className="absolute inset-x-0 bottom-4 text-center">
            <span className={`text-4xl font-bold ${getScoreColor(score)}`}>
              {Math.round(score)}
            </span>
            <p className="text-sm text-muted-foreground mt-1">{getScoreLabel(score)}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-semibold text-green-600">{promoters}</div>
            <div className="text-sm text-muted-foreground">
              Promoters ({promotersPct.toFixed(0)}%)
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-yellow-600">{passives}</div>
            <div className="text-sm text-muted-foreground">
              Passives ({passivesPct.toFixed(0)}%)
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-red-600">{detractors}</div>
            <div className="text-sm text-muted-foreground">
              Detractors ({detractorsPct.toFixed(0)}%)
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
