import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/routes/__root';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export const Route = createFileRoute('/analytics')({
  component: AnalyticsPage,
});

const sourceColors: Record<string, string> = {
  Telegram: 'oklch(0.65 0.18 250)', Avito: 'oklch(0.72 0.19 155)', Yandex: 'oklch(0.78 0.15 85)',
  VK: 'oklch(0.6 0.15 250)', Direct: 'oklch(0.7 0.2 30)', Organic: 'oklch(0.65 0.18 310)', Referral: 'oklch(0.72 0.12 200)',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2 text-xs">
      <p className="font-medium text-foreground">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="mt-0.5">
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString('ru-RU') : p.value}
        </p>
      ))}
    </div>
  );
};

function AnalyticsPage() {
  const auth = useAuthContext();
  const userId = auth.user?.id || '';
  const [leads, setLeads] = useState<any[]>([]);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month');

  useEffect(() => {
    async function fetch() {
      let query = supabase.from('leads').select('*');
      if (!auth.isAdmin) {
        const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', userId).single();
        if (profile) {
          query = supabase.from('leads').select('*').or(`created_by.eq.${userId},manager_id.eq.${profile.id}`);
        }
      }
      const { data } = await query;
      setLeads(data || []);
    }
    if (userId) fetch();
  }, [userId, auth.isAdmin]);

  // Source stats
  const bySource: Record<string, { leads: number; success: number; revenue: number }> = {};
  leads.forEach((l) => {
    const src = l.source || 'Другое';
    if (!bySource[src]) bySource[src] = { leads: 0, success: 0, revenue: 0 };
    bySource[src].leads++;
    if (l.status === 'SUCCESS') { bySource[src].success++; bySource[src].revenue += (l.amount || 0); }
  });
  const sourceList = Object.entries(bySource).sort((a, b) => b[1].leads - a[1].leads);

  // Daily dynamics
  const byDay: Record<string, { leads: number; revenue: number }> = {};
  leads.forEach((l) => {
    const d = l.created_at.slice(0, 10);
    if (!byDay[d]) byDay[d] = { leads: 0, revenue: 0 };
    byDay[d].leads++;
    if (l.status === 'SUCCESS') byDay[d].revenue += (l.amount || 0);
  });
  const dailyData = Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, data]) => ({ day: new Date(day).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }), ...data }));

  // Hourly dynamics
  const byHour: Record<number, number> = {};
  for (let h = 0; h < 24; h++) byHour[h] = 0;
  leads.forEach((l) => { const h = new Date(l.created_at).getHours(); byHour[h]++; });
  const hourlyData = Object.entries(byHour).map(([h, count]) => ({ hour: `${h}:00`, leads: count }));

  // Monthly
  const byMonth: Record<string, { leads: number; revenue: number }> = {};
  leads.forEach((l) => {
    const d = new Date(l.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonth[key]) byMonth[key] = { leads: 0, revenue: 0 };
    byMonth[key].leads++;
    if (l.status === 'SUCCESS') byMonth[key].revenue += (l.amount || 0);
  });
  const monthlyData = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0]))
    .map(([m, data]) => ({ month: new Date(m + '-01').toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }), ...data }));

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Аналитика</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {auth.isAdmin ? 'Общая статистика компании' : 'Ваша персональная статистика'} • {leads.length} лидов
        </p>
      </div>

      {/* Source table */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Источники трафика — детально</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Источник</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Лиды</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Успешных</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Конверсия</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Выручка</th>
              </tr>
            </thead>
            <tbody>
              {sourceList.map(([name, data]) => {
                const conv = data.leads > 0 ? ((data.success / data.leads) * 100).toFixed(1) : '0';
                return (
                  <tr key={name} className="border-b border-border/50 hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ background: sourceColors[name] || 'oklch(0.5 0.1 200)' }} />
                        <span className="font-medium text-foreground">{name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">{data.leads}</td>
                    <td className="px-4 py-3 text-right text-foreground">{data.success}</td>
                    <td className="px-4 py-3 text-right text-emerald font-medium">{conv}%</td>
                    <td className="px-4 py-3 text-right text-gold font-semibold">{data.revenue.toLocaleString('ru-RU')}₽</td>
                  </tr>
                );
              })}
              {sourceList.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">Нет данных</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Динамика лидов по дням</h3>
          <div className="h-[280px]">
            {dailyData.length === 0 ? (
              <p className="text-sm text-muted-foreground flex items-center justify-center h-full">Нет данных</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.015 260)" />
                  <XAxis dataKey="day" tick={{ fill: 'oklch(0.6 0.02 260)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'oklch(0.6 0.02 260)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="leads" name="Лиды" stroke="oklch(0.72 0.19 155)" strokeWidth={2} dot={{ fill: 'oklch(0.72 0.19 155)', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Выручка по месяцам</h3>
          <div className="h-[280px]">
            {monthlyData.length === 0 ? (
              <p className="text-sm text-muted-foreground flex items-center justify-center h-full">Нет данных</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.015 260)" />
                  <XAxis dataKey="month" tick={{ fill: 'oklch(0.6 0.02 260)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'oklch(0.6 0.02 260)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v / 1000}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" name="Выручка" fill="oklch(0.78 0.15 85)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Hourly dynamics */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Динамика по часам</h3>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.015 260)" />
              <XAxis dataKey="hour" tick={{ fill: 'oklch(0.6 0.02 260)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'oklch(0.6 0.02 260)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="leads" name="Лиды" fill="oklch(0.65 0.18 250)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}