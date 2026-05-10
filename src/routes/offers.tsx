import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useCallback } from 'react';
import { categoryColors } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Search, Plus, Banknote } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/routes/__root';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/offers')({
  component: OffersPage,
});

const categories = ['ALL', 'RKO', 'CREDIT', 'DEBIT', 'REGBIZ', 'MFO', 'HR'] as const;

interface DbOffer {
  id: string; name: string; category: string; rate: string | null;
  payout: number | null; geo: string | null; status: string | null;
  stage?: string | null; team_id?: string | null;
  payout_min?: number | null; payout_max?: number | null;
}

function OffersPage() {
  const auth = useAuthContext();
  const [activeCat, setActiveCat] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [offersList, setOffersList] = useState<DbOffer[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string; color: string }[]>([]);
  const [activeTeam, setActiveTeam] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchOffers = useCallback(async () => {
    const sb = supabase as any;
    const [{ data }, { data: tData }] = await Promise.all([
      sb.from('offers').select('*').order('priority', { ascending: false }),
      sb.from('teams').select('id,name,color'),
    ]);
    setOffersList((data as DbOffer[]) || []);
    setTeams((tData as any[]) || []);
  }, []);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  const filtered = offersList.filter((o) => {
    // SECURITY: Enforce team scoping for regular users
    if (!auth.isAdmin) {
      const userTeamId = (auth.profile as Record<string, string> | null)?.team_id;
      if (!userTeamId || o.team_id !== userTeamId) {
        return false;
      }
    }

    if (activeCat !== 'ALL' && o.category !== activeCat) return false;
    if (activeTeam === 'NONE' && o.team_id) return false;
    if (activeTeam !== 'ALL' && activeTeam !== 'NONE' && o.team_id !== activeTeam) return false;
    if (search && !o.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const teamMap = new Map(teams.map((t) => [t.id, t]));

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Офферы</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{offersList.length} офферов</p>
        </div>
        {auth.isAdmin && (
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 rounded-lg bg-emerald px-3 py-2 text-xs font-semibold text-emerald-foreground hover:opacity-90 transition-opacity">
            <Plus className="h-3.5 w-3.5" /> Добавить оффер
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Поиск оффера..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald" />
        </div>
        <div className="flex rounded-lg border border-border bg-surface p-0.5 overflow-x-auto">
          {categories.map((c) => (
            <button key={c} onClick={() => setActiveCat(c)}
              className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap', activeCat === c ? 'bg-emerald/15 text-emerald' : 'text-muted-foreground hover:text-foreground')}>
              {c === 'ALL' ? 'Все' : c}
            </button>
          ))}
        </div>
        {auth.isAdmin && (
          <div className="flex rounded-lg border border-border bg-surface p-0.5 overflow-x-auto">
            {[{ id: 'ALL', name: 'Все команды', color: '' }, { id: 'NONE', name: 'Общие', color: '' }, ...teams].map((t) => (
              <button key={t.id} onClick={() => setActiveTeam(t.id)}
                className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap', activeTeam === t.id ? 'bg-emerald/15 text-emerald' : 'text-muted-foreground hover:text-foreground')}>
                {t.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((offer) => (
          <div key={offer.id} className="glass-card p-5 hover:glow-emerald transition-all cursor-pointer group">
            <div className="flex items-start justify-between">
              <div>
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', categoryColors[offer.category] || 'bg-surface text-muted-foreground')}>
                  {offer.category}
                </span>
                {offer.stage && offer.stage !== 'OTHER' && (
                  <span className="ml-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-surface text-muted-foreground">{offer.stage}</span>
                )}
                {offer.team_id && teamMap.get(offer.team_id) && (
                  <span className="ml-1 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: teamMap.get(offer.team_id)!.color + '25', color: teamMap.get(offer.team_id)!.color }}>{teamMap.get(offer.team_id)!.name}</span>
                )}
                <h3 className="mt-2 text-sm font-semibold text-foreground group-hover:text-emerald transition-colors">{offer.name}</h3>
              </div>
              <div className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', offer.status === 'active' ? 'bg-emerald/20 text-emerald' : 'bg-amber-500/20 text-amber-400')}>
                {offer.status === 'active' ? 'Активен' : 'Пауза'}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Banknote className="h-4 w-4 text-gold" />
                <span className="text-lg font-bold text-gold">
                  {offer.payout_min && offer.payout_max && offer.payout_min !== offer.payout_max
                    ? `${offer.payout_min}–${offer.payout_max}₽`
                    : `${(offer.payout || 0).toLocaleString('ru-RU')}₽`}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">{offer.geo}</span>
            </div>
            {offer.rate && offer.rate !== '0%' && offer.rate !== '-' && (
              <p className="mt-2 text-xs text-muted-foreground">Ставка: {offer.rate}</p>
            )}
          </div>
        ))}
      </div>

      {showAddModal && <AddOfferModalDB onClose={() => setShowAddModal(false)} onSuccess={fetchOffers} />}
    </div>
  );
}

function AddOfferModalDB({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: '', category: 'RKO', rate: '0%', payout: '', geo: 'РФ' });
  const [loading, setLoading] = useState(false);
  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald";

  const handleSubmit = async () => {
    if (!form.name) return;
    setLoading(true);
    const { error } = await supabase.from('offers').insert({
      name: form.name,
      category: form.category as any,
      rate: form.rate,
      payout: Number(form.payout) || 0,
      geo: form.geo,
    });
    setLoading(false);
    if (error) { toast.error('Ошибка создания оффера'); return; }
    toast.success('Оффер создан');
    onClose();
    onSuccess();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader><DialogTitle className="text-foreground">Новый оффер</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <input className={inputClass} placeholder="Название оффера" value={form.name} onChange={(e) => update('name', e.target.value)} />
          <select className={inputClass} value={form.category} onChange={(e) => update('category', e.target.value)}>
            {['RKO', 'CREDIT', 'DEBIT', 'REGBIZ', 'MFO', 'HR'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input className={inputClass} placeholder="Ставка" value={form.rate} onChange={(e) => update('rate', e.target.value)} />
            <input className={inputClass} type="number" placeholder="Выплата ₽" value={form.payout} onChange={(e) => update('payout', e.target.value)} />
          </div>
          <input className={inputClass} placeholder="Гео" value={form.geo} onChange={(e) => update('geo', e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button className="bg-emerald text-emerald-foreground hover:opacity-90" onClick={handleSubmit} disabled={loading}>{loading ? '...' : 'Создать'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}