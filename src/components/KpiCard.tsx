import { cn } from '@/lib/utils';
import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: LucideIcon;
  accentClass?: string;
}

export function KpiCard({ title, value, change, trend, icon: Icon, accentClass = 'text-emerald' }: KpiCardProps) {
  return (
    <div className="glass-card p-5 group hover:glow-emerald transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className={cn('mt-2 text-2xl font-bold tracking-tight', accentClass)}>{value}</p>
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-emerald/10', accentClass)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        {trend === 'up' ? (
          <TrendingUp className="h-3.5 w-3.5 text-emerald" />
        ) : (
          <TrendingDown className="h-3.5 w-3.5 text-destructive" />
        )}
        <span className={cn('text-xs font-medium', trend === 'up' ? 'text-emerald' : 'text-destructive')}>
          {change}
        </span>
        <span className="text-xs text-muted-foreground">vs прошлая неделя</span>
      </div>
    </div>
  );
}