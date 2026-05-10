import { createFileRoute } from '@tanstack/react-router';
import { Bell, Target, MessageCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/notifications')({
  component: NotificationsPage,
});

const notifications = [
  { id: 1, type: 'lead', icon: Target, title: 'Новый лид', desc: 'Иванов Алексей — Альфа Банк РКО', time: '2 мин назад', color: 'text-blue-400' },
  { id: 2, type: 'success', icon: CheckCircle, title: 'Успешная сделка', desc: 'Козлов Дмитрий — Сбер кредитка (1 200₽)', time: '15 мин назад', color: 'text-emerald' },
  { id: 3, type: 'comment', icon: MessageCircle, title: 'Новый комментарий', desc: 'Петров М. добавил комментарий к лиду L-006', time: '32 мин назад', color: 'text-muted-foreground' },
  { id: 4, type: 'alert', icon: AlertTriangle, title: 'Проблемный лид', desc: 'Лид L-008 без ответа более 24 часов', time: '1 час назад', color: 'text-amber-400' },
  { id: 5, type: 'lead', icon: Target, title: 'Новый лид', desc: 'Лебедева Мария — Альфа Банк ИП + РКО', time: '2 часа назад', color: 'text-blue-400' },
];

function NotificationsPage() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Уведомления</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{notifications.length} новых</p>
      </div>
      <div className="space-y-2">
        {notifications.map((n) => (
          <div key={n.id} className="glass-card flex items-center gap-4 p-4 hover:bg-surface-hover transition-colors cursor-pointer">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-surface', n.color)}>
              <n.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{n.title}</p>
              <p className="text-xs text-muted-foreground">{n.desc}</p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{n.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}