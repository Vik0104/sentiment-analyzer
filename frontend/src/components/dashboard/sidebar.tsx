'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sparkles,
  LayoutDashboard,
  BarChart3,
  MessageSquareText,
  Target,
  TrendingUp,
  Settings,
  CreditCard,
  LogOut,
  ChevronDown,
  Store,
} from 'lucide-react';

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Sentiment', href: '/dashboard/sentiment', icon: BarChart3 },
  { name: 'Topics', href: '/dashboard/topics', icon: MessageSquareText, tier: 'starter' },
  { name: 'Aspects', href: '/dashboard/aspects', icon: Target, tier: 'starter' },
  { name: 'Trends', href: '/dashboard/trends', icon: TrendingUp, tier: 'starter' },
];

const tierColors = {
  free: 'bg-muted text-muted-foreground',
  starter: 'bg-blue-100 text-blue-800',
  pro: 'bg-purple-100 text-purple-800',
};

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const usagePercent = user ? (user.reviews_used / user.reviews_limit) * 100 : 0;

  const canAccess = (tier?: string) => {
    if (!tier) return true;
    if (!user) return false;
    const tierLevels = { free: 0, starter: 1, pro: 2 };
    return tierLevels[user.subscription_tier] >= tierLevels[tier as keyof typeof tierLevels];
  };

  return (
    <aside className="flex flex-col w-64 border-r bg-card min-h-screen">
      {/* Logo */}
      <div className="p-4 border-b">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg">Sentiment Analyzer</span>
        </Link>
      </div>

      {/* Shop Info */}
      <div className="p-4 border-b">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-between px-2">
              <div className="flex items-center gap-2 min-w-0">
                <Store className="h-4 w-4 shrink-0" />
                <span className="truncate text-sm">{user?.shop_domain || 'Loading...'}</span>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/billing">
                <CreditCard className="mr-2 h-4 w-4" />
                Billing
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const hasAccess = canAccess(item.tier);

          return (
            <Link
              key={item.name}
              href={hasAccess ? item.href : '/billing'}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : hasAccess
                    ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    : 'text-muted-foreground/50 cursor-not-allowed'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
              {item.tier && !hasAccess && (
                <Badge variant="outline" className="ml-auto text-xs">
                  {item.tier}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      <Separator />

      {/* Usage & Plan */}
      <div className="p-4 space-y-4">
        {/* Current Plan */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Current Plan</span>
          <Badge className={cn(tierColors[user?.subscription_tier || 'free'])}>
            {user?.subscription_tier?.charAt(0).toUpperCase()}
            {user?.subscription_tier?.slice(1) || 'Free'}
          </Badge>
        </div>

        {/* Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Reviews Used</span>
            <span className="font-medium">
              {user?.reviews_used || 0} / {user?.reviews_limit || 100}
            </span>
          </div>
          <Progress value={usagePercent} className="h-2" />
        </div>

        {/* Upgrade CTA */}
        {user?.subscription_tier === 'free' && (
          <Button asChild className="w-full" size="sm">
            <Link href="/billing">Upgrade Plan</Link>
          </Button>
        )}
      </div>
    </aside>
  );
}
