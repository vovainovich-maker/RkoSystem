import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/routes/__root';
import { Plus, Users as UsersIcon, Banknote, TrendingUp, Building2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const Route = createFileRoute('/teams')({ component: TeamsPage });

interface Team {
  id: string; name: string; slug: string; description: string | null;
  logo_url: string | null; color: string | null; status: string | null;
  owner_user_id: string | null; created_at: string;
}

function TeamsPage() {
  const auth = useAuthContext();
  const [teams, setTeams] = useState<Team[]>([]);
  const [stats, setStats] = useState<Record<string, { members: number; revenue: number; leads: number }>>({});
  const [showCreate, setShowCreate] = useState(false);

  const fetchAll = useCallback(async () => {
    const { data: tData } = await (supabase as any).from('teams').select('*').order('created_at', { ascending: false });
    const list = (tData as Team[]) || [];
    setTeams(list);
    const acc: Record<string, { members: number; revenue: number; leads: number }> = {};
    for (const t of list) {
      const [{ count: members }, { data: leads }] = await Promise.all([
        (supabase as any).from('team_members').select('*', { count: 'exact', head: true }).eq('team_id', t.id),
        (supabase as any).from('leads').select('amount,status').eq('team_id', t.id),
      ]);
      const rev = (leads || []).filter((l: any) => l.status === 'SUCCESS').reduce((s: number, l: any) => s + (l.amount || 0), 0);
      acc[t.id] = { members: members || 0, revenue: rev, leads: (leads || []).length };
    }
    setStats(acc);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (!auth.isAdmin) {
    return <div className="p-6 text-muted-foreground">Нет доступа</div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Команды</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{teams.length} команд</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-lg bg-emerald px-3 py-2 text-xs font-semibold text-emerald-foreground hover:opacity-90">
          <Plus className="h-3.5 w-3.5" /> Создать команду
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {teams.map((t) => {
          const s = stats[t.id] || { members: 0, revenue: 0, leads: 0 };
          return (
            <Link key={t.id} to="/teams/$teamId" params={{ teamId: t.id }} className="glass-card p-5 hover:glow-emerald transition-all group">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold" style={{ background: (t.color || '#10b981') + '20', color: t.color || '#10b981' }}>
                  {t.logo_url ? <img src={t.logo_url} alt={t.name} className="h-12 w-12 rounded-xl object-cover" /> : <Building2 className="h-6 w-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-foreground group-hover:text-emerald transition-colors truncate">{t.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{t.description || `@${t.slug}`}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${t.status === 'active' ? 'bg-emerald/20 text-emerald' : 'bg-amber-500/20 text-amber-400'}`}>
                  {t.status === 'active' ? 'Активна' : 'Пауза'}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Stat icon={<UsersIcon className="h-3.5 w-3.5" />} label="Участники" value={s.members.toString()} />
                <Stat icon={<TrendingUp className="h-3.5 w-3.5" />} label="Лиды" value={s.leads.toString()} />
                <Stat icon={<Banknote className="h-3.5 w-3.5" />} label="Доход" value={`${(s.revenue / 1000).toFixed(0)}k₽`} accent />
              </div>
            </Link>
          );
        })}
      </div>

      {showCreate && <CreateTeamModal onClose={() => setShowCreate(false)} onSuccess={fetchAll} />}
    </div>
  );
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-surface p-2">
      <div className="flex items-center gap-1 text-muted-foreground text-[10px]">{icon}{label}</div>
      <p className={`mt-1 text-sm font-bold ${accent ? 'text-gold' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}

function CreateTeamModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: '', slug: '', description: '', color: '#10b981', logo_url: '', owner_email: '' });
  const [loading, setLoading] = useState(false);
  const inputClass = 'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald';

  const handleSubmit = async () => {
    if (!form.name || !form.slug) { toast.error('Название и slug обязательны'); return; }
    setLoading(true);
    let owner_user_id: string | null = null;
    if (form.owner_email) {
      const { data: profile } = await supabase.from('profiles').select('user_id').eq('email', form.owner_email).maybeSingle();
      owner_user_id = (profile as any)?.user_id || null;
    }
    const { error } = await (supabase as any).from('teams').insert({
      name: form.name, slug: form.slug, description: form.description,
      color: form.color, logo_url: form.logo_url, owner_user_id,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Команда создана');
    onClose(); onSuccess();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader><DialogTitle className="text-foreground">Новая команда</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <input className={inputClass} placeholder="Название (например EXC Team)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={inputClass} placeholder="Slug (например exc)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} />
          <input className={inputClass} placeholder="Описание" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className={inputClass} placeholder="URL логотипа" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Цвет</span>
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-9 w-16 rounded-lg border border-border bg-surface" />
          </div>
          <input className={inputClass} placeholder="Email владельца команды (опционально)" value={form.owner_email} onChange={(e) => setForm({ ...form, owner_email: e.target.value })} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button className="bg-emerald text-emerald-foreground hover:opacity-90" onClick={handleSubmit} disabled={loading}>{loading ? '...' : 'Создать'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}