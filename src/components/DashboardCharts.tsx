import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

const sourceColors: Record<string, string> = {
  Telegram: 'oklch(0.65 0.18 250)',
  Avito: 'oklch(0.72 0.19 155)',
  Yandex: 'oklch(0.78 0.15 85)',
  VK: 'oklch(0.6 0.15 250)',
  Direct: 'oklch(0.7 0.2 30)',
  Organic: 'oklch(0.65 0.18 310)',
  Referral: 'oklch(0.72 0.12 200)',
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

function useLeadsData(isAdmin: boolean, userId: string) {
  const [leads, setLeads] = useState<any[]>([]);
  useEffect(() => {
    async function fetch() {
      let query = supabase.from('leads').select('*');
      if (!isAdmin) {
        const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', userId).single();
        if (profile) {
          query = supabase.from('leads').select('*').or(`created_by.eq.${userId},manager_id.eq.${profile.id}`);
        }
      }
      const { data } = await query;
      setLeads(data || []);
    }
    if (userId) fetch();
  }, [isAdmin, userId]);
  return leads;
}

export function RevenueChart({ isAdmin, userId }: { isAdmin: boolean; userId: string }) {
  const leads = useLeadsData(isAdmin, userId);

  const byMonth: Record<string, number> = {};
  leads.forEach((l) => {
    if (l.status === 'SUCCESS') {
      const d = new Date(l.created_at);
      const key = d.toLocaleDateString('ru-RU', { month: 'short' });
      byMonth[key] = (byMonth[key] || 0) + (l.amount || 0);
    }
  });
  const data = Object.entries(byMonth).map(([month, revenue]) => ({ month, revenue }));

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Выручка</h3>
      <div className="h-[240px]">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground flex items-center justify-center h-full">Нет данных</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.72 0.19 155)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="oklch(0.72 0.19 155)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.015 260)" />
              <XAxis dataKey="month" tick={{ fill: 'oklch(0.6 0.02 260)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'oklch(0.6 0.02 260)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v / 1000}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Выручка" stroke="oklch(0.72 0.19 155)" fill="url(#revenueGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export function LeadsChart({ isAdmin, userId }: { isAdmin: boolean; userId: string }) {
  const leads = useLeadsData(isAdmin, userId);

  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const byDay: Record<string, { leads: number; success: number }> = {};
  days.forEach((d) => { byDay[d] = { leads: 0, success: 0 }; });
  leads.forEach((l) => {
    const d = new Date(l.created_at);
    const day = days[d.getDay()];
    byDay[day].leads++;
    if (l.status === 'SUCCESS') byDay[day].success++;
  });
  const data = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => ({ day, ...byDay[day] }));

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Лиды по дням</h3>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.015 260)" />
            <XAxis dataKey="day" tick={{ fill: 'oklch(0.6 0.02 260)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'oklch(0.6 0.02 260)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="leads" name="Всего" fill="oklch(0.72 0.19 155 / 40%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="success" name="Успешных" fill="oklch(0.72 0.19 155)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function SourcesPieChart({ isAdmin, userId }: { isAdmin: boolean; userId: string }) {
  const leads = useLeadsData(isAdmin, userId);

  const bySource: Record<string, number> = {};
  leads.forEach((l) => {
    const src = l.source || 'Другое';
    bySource[src] = (bySource[src] || 0) + 1;
  });
  const data = Object.entries(bySource)
    .map(([name, count]) => ({ name, leads: count, color: sourceColors[name] || 'oklch(0.5 0.1 200)' }))
    .sort((a, b) => b.leads - a.leads);

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Источники трафика</h3>
      <div className="h-[240px] flex items-center gap-4">
        <div className="w-1/2 h-full">
          {data.length === 0 ? (
            <p className="text-sm text-muted-foreground flex items-center justify-center h-full">Нет данных</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="leads">
                  {data.map((s, i) => (
                    <Cell key={i} fill={s.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="w-1/2 space-y-2">
          {data.slice(0, 5).map((s) => (
            <div key={s.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                <span className="text-muted-foreground">{s.name}</span>
              </div>
              <span className="font-medium text-foreground">{s.leads}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}