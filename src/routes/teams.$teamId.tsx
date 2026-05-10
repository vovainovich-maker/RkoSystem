import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/routes/__root';
import { ArrowLeft, Banknote, Users as UsersIcon, Target, TrendingUp, UserPlus, Building2, Trash2, Plus, BarChart3, ShoppingCart, XCircle, Wifi } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';

export const Route = createFileRoute('/teams/$teamId')({ component: TeamDetailPage });

function TeamDetailPage() {
  const { teamId } = Route.useParams();
  const auth = useAuthContext();
  const [team, setTeam] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddOffer, setShowAddOffer] = useState(false);

  const fetchAll = useCallback(async () => {
    const sb = supabase as any;
    const [{ data: t }, { data: tm }, { data: o }, { data: l }] = await Promise.all([
      sb.from('teams').select('*').eq('id', teamId).maybeSingle(),
      sb.from('team_members').select('*, profiles:user_id(name,email,avatar_url)').eq('team_id', teamId),
      sb.from('offers').select('*').eq('team_id', teamId).order('priority', { ascending: false }),
      sb.from('leads').select('*').eq('team_id', teamId),
    ]);
    setTeam(t);
    // profiles relation may not be set up; refetch profiles separately
    const memberRows = (tm as any[]) || [];
    if (memberRows.length) {
      const userIds = memberRows.map((m) => m.user_id);
      const { data: profs } = await sb.from('profiles').select('user_id,name,email,avatar_url,status').in('user_id', userIds);
      const profMap = new Map((profs || []).map((p: any) => [p.user_id, p]));
      setMembers(memberRows.map((m) => ({ ...m, profile: profMap.get(m.user_id) })));
    } else setMembers([]);
    setOffers((o as any[]) || []);
    setLeads((l as any[]) || []);
  }, [teamId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (!team) return <div className="p-6 text-muted-foreground">Загрузка...</div>;

  const revenue = leads.filter((l) => l.status === 'SUCCESS').reduce((s, l) => s + (l.amount || 0), 0);
  const conversion = leads.length ? (leads.filter((l) => l.status === 'SUCCESS').length / leads.length) * 100 : 0;
  const memberStats = members.map((m) => {
    const own = leads.filter((l) => l.created_by === m.user_id);
    const success = own.filter((l) => l.status === 'SUCCESS');
    return { ...m, leadsCount: own.length, revenue: success.reduce((s, l) => s + (l.amount || 0), 0) };
  }).sort((a, b) => b.revenue - a.revenue);

  const canManage = auth.isAdmin || team.owner_user_id === auth.user?.id || auth.role === 'team_lead';

  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (!confirm('Удалить участника из команды?')) return;
    const { error } = await (supabase as any).from('team_members').delete().eq('id', memberId);
    if (error) { toast.error(error.message); return; }
    await (supabase as any).from('profiles').update({ team_id: null }).eq('user_id', userId);
    toast.success('Участник удалён');
    fetchAll();
  };

  const handleRemoveOffer = async (offerId: string) => {
    if (!confirm('Открепить оффер от команды?')) return;
    const { error } = await (supabase as any).from('offers').update({ team_id: null }).eq('id', offerId);
    if (error) { toast.error(error.message); return; }
    toast.success('Оффер откреплён');
    fetchAll();
  };

  // Analytics: revenue by day (last 30)
  const days: { date: string; revenue: number; leads: number }[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    const dayLeads = leads.filter((l) => { const t = new Date(l.created_at); return t >= d && t < next; });
    days.push({
      date: d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
      revenue: dayLeads.filter((l) => l.status === 'SUCCESS').reduce((s, l) => s + (l.amount || 0), 0),
      leads: dayLeads.length,
    });
  }
  // Status breakdown
  const statusGroups = ['NEW', 'IN_PROGRESS', 'SUCCESS', 'REJECTED'].map((st) => ({
    name: st,
    value: leads.filter((l) => l.status === st).length,
  }));
  const STATUS_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444'];
  // Top offers
  const offerAgg = new Map<string, number>();
  leads.filter((l) => l.status === 'SUCCESS').forEach((l) => {
    const key = l.offer || '—';
    offerAgg.set(key, (offerAgg.get(key) || 0) + (l.amount || 0));
  });
  const topOffers = Array.from(offerAgg.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <Link to="/teams" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" />К списку команд</Link>

      <div className="glass-card p-5 flex items-start gap-4 flex-wrap">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold" style={{ background: (team.color || '#10b981') + '20', color: team.color }}>
          {team.logo_url ? <img src={team.logo_url} alt={team.name} className="h-16 w-16 rounded-2xl object-cover" /> : <Building2 className="h-8 w-8" />}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{team.name}</h1>
          <p className="text-sm text-muted-foreground">@{team.slug}{team.description && ` • ${team.description}`}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiMini icon={<UsersIcon className="h-4 w-4" />} label="Участники" value={members.length.toString()} />
        <KpiMini icon={<Target className="h-4 w-4" />} label="Лиды" value={leads.length.toString()} />
        <KpiMini icon={<Banknote className="h-4 w-4" />} label="Доход" value={`${revenue.toLocaleString('ru-RU')}₽`} accent />
        <KpiMini icon={<TrendingUp className="h-4 w-4" />} label="Конверсия" value={`${conversion.toFixed(1)}%`} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiMini icon={<BarChart3 className="h-4 w-4" />} label="Средний чек" value={`${leads.filter(l => l.status === 'SUCCESS').length > 0 ? Math.round(revenue / leads.filter(l => l.status === 'SUCCESS').length).toLocaleString('ru-RU') : 0}₽`} />
        <KpiMini icon={<ShoppingCart className="h-4 w-4" />} label="Офферы" value={offers.length.toString()} />
        <KpiMini icon={<XCircle className="h-4 w-4" />} label="Отказы" value={leads.filter(l => l.status === 'REJECTED').length.toString()} />
        <KpiMini icon={<Wifi className="h-4 w-4" />} label="Онлайн" value={`${members.filter(m => m.profile?.status === 'online').length}/${members.length}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Участники команды</h3>
            {canManage && (
              <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 rounded-lg bg-emerald/15 text-emerald px-2.5 py-1 text-xs font-medium hover:bg-emerald/25">
                <UserPlus className="h-3 w-3" /> Добавить
              </button>
            )}
          </div>
          <div className="space-y-2">
            {memberStats.length === 0 && <p className="text-sm text-muted-foreground">Нет участников</p>}
            {memberStats.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg bg-surface p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald/15 text-xs font-semibold text-emerald">
                    {m.profile?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '??'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.profile?.name || 'Без имени'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{m.profile?.email} • {m.team_role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold text-gold">{m.revenue.toLocaleString('ru-RU')}₽</p>
                    <p className="text-[10px] text-muted-foreground">{m.leadsCount} лидов</p>
                  </div>
                  {canManage && (
                    <button onClick={() => handleRemoveMember(m.id, m.user_id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Офферы команды ({offers.length})</h3>
            {canManage && (
              <button onClick={() => setShowAddOffer(true)} className="flex items-center gap-1 rounded-lg bg-emerald/15 text-emerald px-2.5 py-1 text-xs font-medium hover:bg-emerald/25">
                <Plus className="h-3 w-3" /> Оффер
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {offers.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-lg bg-surface p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{o.name}</p>
                  <p className="text-[10px] text-muted-foreground">{o.stage} • {o.category}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <p className="text-sm font-bold text-gold">
                    {o.payout_min !== o.payout_max
                      ? `${o.payout_min}–${o.payout_max}₽`
                      : `${o.payout?.toLocaleString('ru-RU')}₽`}
                  </p>
                  {canManage && (
                    <button onClick={() => handleRemoveOffer(o.id)} className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="glass-card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-4">Динамика дохода (30 дней)</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={days}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} name="Доход" />
                <Line type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} dot={false} name="Лиды" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Статусы лидов</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusGroups} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                  {statusGroups.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {topOffers.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Топ офферы по доходу</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topOffers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} width={140} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Bar dataKey="value" fill="#facc15" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {showAdd && <AddMemberModal teamId={teamId} onClose={() => setShowAdd(false)} onSuccess={fetchAll} />}
      {showAddOffer && <AddOfferModal teamId={teamId} onClose={() => setShowAddOffer(false)} onSuccess={fetchAll} />}
    </div>
  );
}

function KpiMini({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className="glass-card p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">{icon}{label}</div>
      <p className={`mt-1 text-xl font-bold ${accent ? 'text-gold' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}

function AddMemberModal({ teamId, onClose, onSuccess }: { teamId: string; onClose: () => void; onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    setLoading(true);
    const { data: profile } = await supabase.from('profiles').select('user_id').eq('email', email).maybeSingle();
    if (!profile) { toast.error('Пользователь не найден'); setLoading(false); return; }
    const { error } = await (supabase as any).from('team_members').insert({ team_id: teamId, user_id: (profile as any).user_id, team_role: role });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    await (supabase as any).from('profiles').update({ team_id: teamId }).eq('user_id', (profile as any).user_id);
    toast.success('Участник добавлен');
    onClose(); onSuccess();
  };

  const inputClass = 'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-emerald';
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader><DialogTitle className="text-foreground">Добавить участника</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <input className={inputClass} placeholder="Email пользователя" value={email} onChange={(e) => setEmail(e.target.value)} />
          <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="member">Участник</option>
            <option value="lead">Team Lead</option>
            <option value="owner">Owner</option>
          </select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button className="bg-emerald text-emerald-foreground hover:opacity-90" onClick={handleAdd} disabled={loading}>{loading ? '...' : 'Добавить'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddOfferModal({ teamId, onClose, onSuccess }: { teamId: string; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: '', stage: 'RKO', category: 'RKO', payout_min: 0, payout_max: 0, geo: 'РФ' });
  const [loading, setLoading] = useState(false);
  const upd = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const inputClass = 'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-emerald';

  const handleAdd = async () => {
    if (!form.name) { toast.error('Укажите название'); return; }
    setLoading(true);
    const payload: any = {
      name: form.name,
      stage: form.stage,
      category: form.category,
      payout_min: form.payout_min,
      payout_max: form.payout_max || form.payout_min,
      payout: form.payout_max || form.payout_min,
      geo: form.geo,
      team_id: teamId,
      status: 'active',
    };
    const { error } = await (supabase as any).from('offers').insert(payload);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Оффер добавлен');
    onClose(); onSuccess();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader><DialogTitle className="text-foreground">Новый оффер команды</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <input className={inputClass} placeholder="Название оффера" value={form.name} onChange={(e) => upd('name', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <select className={inputClass} value={form.stage} onChange={(e) => upd('stage', e.target.value)}>
              <option value="DEBIT">DEBIT</option>
              <option value="RKO">RKO</option>
              <option value="CREDIT">CREDIT</option>
              <option value="MFO">MFO</option>
              <option value="OTHER">OTHER</option>
            </select>
            <select className={inputClass} value={form.category} onChange={(e) => upd('category', e.target.value)}>
              <option value="RKO">RKO</option>
              <option value="DEBIT">DEBIT</option>
              <option value="CREDIT">CREDIT</option>
              <option value="MFO">MFO</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className={inputClass} type="number" placeholder="Выплата от, ₽" value={form.payout_min} onChange={(e) => upd('payout_min', Number(e.target.value))} />
            <input className={inputClass} type="number" placeholder="Выплата до, ₽" value={form.payout_max} onChange={(e) => upd('payout_max', Number(e.target.value))} />
          </div>
          <input className={inputClass} placeholder="ГЕО" value={form.geo} onChange={(e) => upd('geo', e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button className="bg-emerald text-emerald-foreground hover:opacity-90" onClick={handleAdd} disabled={loading}>{loading ? '...' : 'Создать'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}