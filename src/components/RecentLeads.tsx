import { statusColors } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

const statusLabels: Record<string, string> = {
  NEW: 'Новый',
  IN_PROGRESS: 'В работе',
  SUCCESS: 'Успех',
  REJECTED: 'Отказ',
};

export function RecentLeads({ isAdmin, userId }: { isAdmin: boolean; userId: string }) {
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    async function fetch() {
      let query = supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(5);
      if (!isAdmin) {
        const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', userId).single();
        if (profile) {
          query = supabase.from('leads').select('*').or(`created_by.eq.${userId},manager_id.eq.${profile.id}`).order('created_at', { ascending: false }).limit(5);
        }
      }
      const { data } = await query;
      setLeads(data || []);
    }
    if (userId) fetch();
  }, [isAdmin, userId]);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Последние лиды</h3>
        <span className="text-xs text-muted-foreground">Сегодня</span>
      </div>
      <div className="space-y-3">
        {leads.length === 0 && <p className="text-sm text-muted-foreground">Нет лидов</p>}
        {leads.map((lead: any) => (
          <div key={lead.id} className="flex items-center justify-between rounded-lg bg-surface p-3 hover:bg-surface-hover transition-colors gap-2 flex-wrap">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald/10 text-xs font-semibold text-emerald">
                {lead.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{lead.name}</p>
                <p className="text-xs text-muted-foreground">{lead.offer}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-medium', statusColors[lead.status])}>
                {statusLabels[lead.status]}
              </span>
              <span className="text-sm font-semibold text-gold">{(lead.amount || 0).toLocaleString('ru-RU')}₽</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}