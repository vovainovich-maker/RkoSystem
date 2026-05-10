import { createFileRoute } from '@tanstack/react-router';
import { Settings, Globe, Mail, Bot, Key, Palette } from 'lucide-react';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Настройки</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Управление конфигурацией системы</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[
          { icon: Globe, title: 'Общие', desc: 'Название компании, логотип, валюта, часовой пояс' },
          { icon: Mail, title: 'SMTP', desc: 'Настройки почтового сервера для уведомлений' },
          { icon: Bot, title: 'Telegram Bot', desc: 'Токен бота, webhook URL, уведомления' },
          { icon: Key, title: 'API Keys', desc: 'Ключи доступа к внешним сервисам' },
          { icon: Palette, title: 'White Label', desc: 'Кастомизация бренда, цвета, домен' },
          { icon: Settings, title: 'Безопасность', desc: 'CSRF, rate limiting, аудит логов' },
        ].map((item) => (
          <div key={item.title} className="glass-card p-5 hover:glow-emerald transition-all cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald/10 text-emerald">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground group-hover:text-emerald transition-colors">{item.title}</h3>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}