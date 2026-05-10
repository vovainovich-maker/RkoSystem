import { createFileRoute } from "@tanstack/react-router";
import { RevenueChart, LeadsChart, SourcesPieChart } from "@/components/DashboardCharts";
import { RecentLeads } from "@/components/RecentLeads";
import { DollarSign, Target, TrendingUp, Zap, Bot, Users, AlertTriangle } from "lucide-react";
import { useAuthContext } from "@/routes/__root";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { statusColors } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  component: Index,
});

interface LeadRow {
  id: string; name: string; source: string | null; offer: string | null; offer_category: string | null;
  status: string; amount: number | null; ai_score: number | null; comment: string | null;
  created_by: string | null; manager_id: string | null; created_at: string;
  phone: string | null; telegram: string | null; email: string | null;
}

const statusLabels: Record<string, string> = { NEW: 'Новый', IN_PROGRESS: 'В работе', SUCCESS: 'Успех', REJECTED: 'Отказ' };

function Index() {
  const auth = useAuthContext();
  const userId = auth.user?.id || '';
  const [allLeads, setAllLeads] = useState<LeadRow[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [modal, setModal] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      if (!userId) return;
      let query = supabase.from('leads').select('*');
      if (!auth.isAdmin) {
        const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', userId).single();
        if (profile) {
          query = supabase.from('leads').select('*').or(`created_by.eq.${userId},manager_id.eq.${profile.id}`);
        }
      }
      const { data: leads } = await query;
      setAllLeads((leads as LeadRow[]) || []);

      if (auth.isAdmin) {
        const { data: profs } = await supabase.from('profiles').select('*');
        const { data: roles } = await supabase.from('user_roles').select('*');
        const roleMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));
        setProfiles((profs || []).map((p: any) => ({ ...p, role: roleMap.get(p.user_id) || 'user' })));
        setUserCount((profs || []).length);
      }
    }
    fetchAll();
  }, [userId, auth.isAdmin]);

  const totalLeads = allLeads.length;
  const successLeads = allLeads.filter((l) => l.status === 'SUCCESS').length;
  const rejectedLeads = allLeads.filter((l) => l.status === 'REJECTED').length;
  const totalRevenue = allLeads.filter((l) => l.status === 'SUCCESS').reduce((s, l) => s + (l.amount || 0), 0);
  const conversion = totalLeads > 0 ? ((successLeads / totalLeads) * 100).toFixed(1) : '0';
  const profileName = (auth.profile as Record<string, string> | null)?.name || 'User';

  const problemLeads = allLeads.filter((l) => {
    if (l.status === 'REJECTED') return true;
    if ((l.ai_score || 0) < 30) return true;
    if (!l.phone && !l.telegram && !l.email) return true;
    return false;
  });

  // Source stats
  const bySource: Record<string, { count: number; revenue: number }> = {};
  allLeads.forEach((l) => {
    const src = l.source || 'Другое';
    if (!bySource[src]) bySource[src] = { count: 0, revenue: 0 };
    bySource[src].count++;
    if (l.status === 'SUCCESS') bySource[src].revenue += (l.amount || 0);
  });
  const sourceList = Object.entries(bySource).sort((a, b) => b[1].revenue - a[1].revenue);

  // Per-user stats
  const byUser: Record<string, { name: string; count: number; revenue: number }> = {};
  allLeads.forEach((l) => {
    const uid = l.created_by || 'unknown';
    if (!byUser[uid]) {
      const prof = profiles.find((p: any) => p.user_id === uid);
      byUser[uid] = { name: prof?.name || uid.slice(0, 8), count: 0, revenue: 0 };
    }
    byUser[uid].count++;
    if (l.status === 'SUCCESS') byUser[uid].revenue += (l.amount || 0);
  });
  const userLeadList = Object.entries(byUser).sort((a, b) => b[1].revenue - a[1].revenue);

  // Period stats
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const monthAgo = new Date(now.getTime() - 30 * 86400000);
  const todayLeads = allLeads.filter((l) => l.created_at.slice(0, 10) === todayStr);
  const weekLeads = allLeads.filter((l) => new Date(l.created_at) >= weekAgo);
  const monthLeads = allLeads.filter((l) => new Date(l.created_at) >= monthAgo);
  const todayRevenue = todayLeads.filter((l) => l.status === 'SUCCESS').reduce((s, l) => s + (l.amount || 0), 0);
  const weekRevenue = weekLeads.filter((l) => l.status === 'SUCCESS').reduce((s, l) => s + (l.amount || 0), 0);
  const monthRevenue = monthLeads.filter((l) => l.status === 'SUCCESS').reduce((s, l) => s + (l.amount || 0), 0);

  // Source conversion
  const sourceConversion = sourceList.map(([name, data]) => {
    const srcLeads = allLeads.filter((l) => (l.source || 'Другое') === name);
    const srcSuccess = srcLeads.filter((l) => l.status === 'SUCCESS').length;
    return { name, total: data.count, success: srcSuccess, conversion: data.count > 0 ? ((srcSuccess / data.count) * 100).toFixed(1) : '0', revenue: data.revenue };
  });

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Привет, {profileName} 👋</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{auth.isAdmin ? 'Обзор всей компании' : 'Ваши персональные показатели'}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg bg-emerald/10 px-3 py-1.5">
            <Zap className="h-3.5 w-3.5 text-emerald" />
            <span className="text-xs font-medium text-emerald">Live</span>
          </div>
        </div>
      </div>

      {/* KPI Cards — clickable */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <button onClick={() => setModal('leads')} className="text-left">
          <KpiClickable title="Всего лидов" value={String(totalLeads)} icon={Target} accent="text-gold" />
        </button>
        <button onClick={() => setModal('revenue')} className="text-left">
          <KpiClickable title="Общая сумма" value={`${totalRevenue.toLocaleString('ru-RU')}₽`} icon={DollarSign} accent="text-emerald" />
        </button>
        <button onClick={() => setModal('conversion')} className="text-left">
          <KpiClickable title="Конверсия" value={`${conversion}%`} icon={TrendingUp} accent="text-blue-400" />
        </button>
        {auth.isAdmin ? (
          <button onClick={() => setModal('users')} className="text-left">
            <KpiClickable title="Пользователей" value={String(userCount)} icon={Users} accent="text-purple-400" />
          </button>
        ) : (
          <KpiClickable title="Успешные / Отказы" value={`${successLeads} / ${rejectedLeads}`} icon={Bot} accent="text-emerald" />
        )}
      </div>

      {/* Extra admin KPIs */}
      {auth.isAdmin && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <button onClick={() => setModal('problems')} className="text-left">
            <KpiClickable title="Проблемные лиды" value={String(problemLeads.length)} icon={AlertTriangle} accent="text-destructive" />
          </button>
          <KpiClickable title="Успешные / Отказы" value={`${successLeads} / ${rejectedLeads}`} icon={Bot} accent="text-emerald" />
          <KpiClickable title="Сегодня" value={`${todayLeads.length} лидов • ${todayRevenue.toLocaleString('ru-RU')}₽`} icon={Zap} accent="text-amber-400" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <RevenueChart isAdmin={auth.isAdmin} userId={userId} />
        <LeadsChart isAdmin={auth.isAdmin} userId={userId} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RecentLeads isAdmin={auth.isAdmin} userId={userId} />
        </div>
        <SourcesPieChart isAdmin={auth.isAdmin} userId={userId} />
      </div>

      {/* Top Users / Top Teams (admin only) */}
      {auth.isAdmin && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">🏆 Топ пользователей по заработку</h3>
            <div className="space-y-2">
              {userLeadList.slice(0, 10).map(([uid, data], i) => (
                <div key={uid} className="flex items-center justify-between rounded-lg bg-surface p-2.5">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                    <span className="text-sm font-medium text-foreground">{data.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">{data.count} лидов</span>
                    <span className="text-sm font-semibold text-gold">{data.revenue.toLocaleString('ru-RU')}₽</span>
                  </div>
                </div>
              ))}
              {userLeadList.length === 0 && <p className="text-sm text-muted-foreground">Нет данных</p>}
            </div>
          </div>
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">📊 Распределение по продуктам</h3>
            <div className="space-y-2">
              {Object.entries(
                allLeads.reduce((acc: Record<string, { count: number; revenue: number }>, l) => {
                  const cat = l.offer_category || 'Другое';
                  if (!acc[cat]) acc[cat] = { count: 0, revenue: 0 };
                  acc[cat].count++;
                  if (l.status === 'SUCCESS') acc[cat].revenue += (l.amount || 0);
                  return acc;
                }, {})
              ).sort((a, b) => b[1].revenue - a[1].revenue).map(([cat, data]) => (
                <div key={cat} className="flex items-center justify-between rounded-lg bg-surface p-2.5">
                  <span className="text-sm font-medium text-foreground">{cat}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">{data.count} лидов</span>
                    <span className="text-sm font-semibold text-gold">{data.revenue.toLocaleString('ru-RU')}₽</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI Assistant */}
      <div className="glass-card p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="h-5 w-5 text-emerald" />
          <h3 className="text-sm font-semibold text-foreground">AI Помощник</h3>
        </div>
        <div className="space-y-2">
          {totalLeads === 0 ? (
            <p className="text-sm text-muted-foreground">Добавьте первый лид, чтобы получить рекомендации от AI</p>
          ) : (
            <>
              {Number(conversion) < 20 && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                  <p className="text-xs text-amber-400">⚠️ Конверсия ниже 20%. Рекомендуем проверить качество лидов и скорость обработки.</p>
                </div>
              )}
              {rejectedLeads > successLeads && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                  <p className="text-xs text-destructive">🔴 Отказов больше, чем успешных сделок. Проанализируйте причины отказов.</p>
                </div>
              )}
              {problemLeads.length > 0 && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                  <p className="text-xs text-amber-400">⚠️ {problemLeads.length} проблемных лидов требуют внимания.</p>
                </div>
              )}
              <div className="rounded-lg bg-emerald/10 border border-emerald/20 p-3">
                <p className="text-xs text-emerald">💡 Совет: сфокусируйтесь на лидах с высоким AI Score для максимальной конверсии.</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODALS */}
      {/* Leads Detail */}
      <Dialog open={modal === 'leads'} onOpenChange={() => setModal(null)}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-foreground">Все лиды — кто сколько принёс</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {[...allLeads].sort((a, b) => (b.amount || 0) - (a.amount || 0)).map((l, i) => (
              <div key={l.id} className="flex items-center justify-between rounded-lg bg-surface p-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-6">#{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{l.name}</p>
                    <p className="text-xs text-muted-foreground">{l.source} • {l.offer}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', statusColors[l.status])}>{statusLabels[l.status]}</span>
                  <span className="text-sm font-semibold text-gold">{(l.amount || 0).toLocaleString('ru-RU')}₽</span>
                </div>
              </div>
            ))}
            {allLeads.length === 0 && <p className="text-sm text-muted-foreground">Нет лидов</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Revenue Detail */}
      <Dialog open={modal === 'revenue'} onOpenChange={() => setModal(null)}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-foreground">Доход по источникам</DialogTitle></DialogHeader>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-lg bg-surface p-3 text-center">
              <p className="text-xs text-muted-foreground">Сегодня</p>
              <p className="text-lg font-bold text-gold">{todayRevenue.toLocaleString('ru-RU')}₽</p>
              <p className="text-xs text-muted-foreground">{todayLeads.length} лидов</p>
            </div>
            <div className="rounded-lg bg-surface p-3 text-center">
              <p className="text-xs text-muted-foreground">Неделя</p>
              <p className="text-lg font-bold text-gold">{weekRevenue.toLocaleString('ru-RU')}₽</p>
              <p className="text-xs text-muted-foreground">{weekLeads.length} лидов</p>
            </div>
            <div className="rounded-lg bg-surface p-3 text-center">
              <p className="text-xs text-muted-foreground">Месяц</p>
              <p className="text-lg font-bold text-gold">{monthRevenue.toLocaleString('ru-RU')}₽</p>
              <p className="text-xs text-muted-foreground">{monthLeads.length} лидов</p>
            </div>
          </div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">По источникам</h4>
          <div className="space-y-2">
            {sourceList.map(([name, data]) => (
              <div key={name} className="flex items-center justify-between rounded-lg bg-surface p-3">
                <span className="text-sm font-medium text-foreground">{name}</span>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">{data.count} лидов</span>
                  <span className="text-sm font-semibold text-gold">{data.revenue.toLocaleString('ru-RU')}₽</span>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Conversion Detail */}
      <Dialog open={modal === 'conversion'} onOpenChange={() => setModal(null)}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-foreground">Конверсия по источникам</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {sourceConversion.map((s) => (
              <div key={s.name} className="rounded-lg bg-surface p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground">{s.name}</span>
                  <span className="text-sm font-bold text-emerald">{s.conversion}%</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Всего: {s.total}</span>
                  <span>Успешных: {s.success}</span>
                  <span>Доход: {s.revenue.toLocaleString('ru-RU')}₽</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-surface">
                  <div className="h-full rounded-full bg-emerald" style={{ width: `${s.conversion}%` }} />
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Users Detail (admin) */}
      <Dialog open={modal === 'users'} onOpenChange={() => setModal(null)}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-foreground">Пользователи</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {profiles.map((p: any) => {
              const uData = byUser[p.user_id];
              return (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-surface p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald/10 text-xs font-semibold text-emerald">
                      {p.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.role} • {p.team || 'без команды'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">{uData?.count || 0} лидов</span>
                    <span className="text-sm font-semibold text-gold">{(uData?.revenue || 0).toLocaleString('ru-RU')}₽</span>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Problem Leads (admin) */}
      <Dialog open={modal === 'problems'} onOpenChange={() => setModal(null)}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-foreground">Проблемные лиды</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {problemLeads.map((l) => {
              const problems: string[] = [];
              if (l.status === 'REJECTED') problems.push('Отказ');
              if ((l.ai_score || 0) < 30) problems.push('Низкий AI Score');
              if (!l.phone && !l.telegram && !l.email) problems.push('Нет контактов');
              const owner = profiles.find((p: any) => p.user_id === l.created_by);
              return (
                <div key={l.id} className="rounded-lg bg-surface p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-foreground">{l.name}</p>
                    <span className="text-xs text-muted-foreground">{l.source}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {problems.map((p) => (
                      <span key={p} className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-medium text-destructive">{p}</span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Менеджер: {owner?.name || 'Не назначен'} • {l.offer || 'Без оффера'}
                  </p>
                </div>
              );
            })}
            {problemLeads.length === 0 && <p className="text-sm text-muted-foreground">Нет проблемных лидов</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiClickable({ title, value, icon: Icon, accent }: { title: string; value: string; icon: any; accent: string }) {
  return (
    <div className="glass-card p-5 group hover:glow-emerald transition-all duration-300 cursor-pointer w-full">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className={cn('mt-2 text-2xl font-bold tracking-tight', accent)}>{value}</p>
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-emerald/10', accent)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
