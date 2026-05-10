import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { statusColors } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Search, Plus, Download, LayoutGrid, List, Phone, MessageCircle, Mail, Bot, Edit, Trash2, ImageIcon, Lightbulb, Flame, Snowflake, Sun, Skull, TrendingUp, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/routes/__root';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { analyzeLeadAI, buildHistoricalStats, getScoreColor, TEMPERATURE_CONFIG, type AIAnalysisResult, type LeadTemperature } from '@/lib/ai-scoring';

export const Route = createFileRoute('/leads')({
  component: LeadsPage,
});

const statusLabels: Record<string, string> = {
  NEW: 'Новый',
  IN_PROGRESS: 'В работе',
  SUCCESS: 'Успех',
  REJECTED: 'Отказ',
};

const statuses = ['ALL', 'NEW', 'IN_PROGRESS', 'SUCCESS', 'REJECTED'] as const;
const sources = ['Telegram', 'Avito', 'Yandex', 'VK', 'Direct', 'Organic', 'Referral'];

interface DbLead {
  id: string;
  name: string;
  phone: string | null;
  telegram: string | null;
  email: string | null;
  source: string | null;
  offer: string | null;
  offer_category: string | null;
  status: string;
  amount: number | null;
  ai_score: number | null;
  ai_probability: number | null;
  ai_recommendations: string[] | null;
  ai_flags: string[] | null;
  lead_temperature: LeadTemperature | null;
  comment: string | null;
  created_by: string | null;
  created_at: string;
  manager_id: string | null;
  image_url: string | null;
}

function getLeadTips(lead: DbLead): string[] {
  // Use AI-generated recommendations if available
  if (lead.ai_recommendations && lead.ai_recommendations.length > 0) {
    return lead.ai_recommendations;
  }
  // Fallback: compute live
  const ai = analyzeLeadAI(lead);
  if (ai.ai_recommendations.length > 0) return ai.ai_recommendations;
  return ['Лид заполнен корректно ✓'];
}

function LeadsPage() {
  const auth = useAuthContext();
  const [activeStatus, setActiveStatus] = useState<string>('ALL');
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [search, setSearch] = useState('');
  const [leadsList, setLeadsList] = useState<DbLead[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editLead, setEditLead] = useState<DbLead | null>(null);

  const fetchLeads = useCallback(async () => {
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (error) {
      toast.error('Ошибка загрузки лидов');
      return;
    }
    const raw = (data as unknown as DbLead[]) || [];
    // Build stats and recalculate AI scores in real-time
    const stats = buildHistoricalStats(raw);
    const scored = raw.map(lead => {
      const ai = analyzeLeadAI(lead, stats);
      return { ...lead, ai_score: ai.ai_score, ai_probability: ai.ai_probability, lead_temperature: ai.lead_temperature, ai_recommendations: ai.ai_recommendations, ai_flags: ai.ai_flags };
    });
    setLeadsList(scored);
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const historicalStats = useMemo(() => buildHistoricalStats(leadsList), [leadsList]);

  const filtered = leadsList.filter((l) => {
    if (activeStatus !== 'ALL' && l.status !== activeStatus) return false;
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !(l.offer || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleDelete = async (id: string) => {
    if (!auth.isAdmin) return;
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) { toast.error('Ошибка удаления'); return; }
    toast.success('Лид удалён');
    fetchLeads();
  };

  const handleExportCSV = () => {
    if (!auth.isAdmin) { toast.error('Только для администраторов'); return; }
    const headers = ['Имя', 'Телефон', 'Email', 'Источник', 'Оффер', 'Статус', 'Сумма', 'AI Score'];
    const rows = leadsList.map((l) => [l.name, l.phone, l.email, l.source, l.offer, l.status, l.amount, l.ai_score]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'leads_export.csv';
    link.click();
  };

  const kanbanStatuses = ['NEW', 'IN_PROGRESS', 'SUCCESS', 'REJECTED'] as const;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Лиды</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{leadsList.length} записей</p>
        </div>
        <div className="flex items-center gap-2">
          {auth.isAdmin && (
            <button onClick={handleExportCSV} className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors">
              <Download className="h-3.5 w-3.5" /> Экспорт CSV
            </button>
          )}
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 rounded-lg bg-emerald px-3 py-2 text-xs font-semibold text-emerald-foreground hover:opacity-90 transition-opacity">
            <Plus className="h-3.5 w-3.5" /> Новый лид
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Поиск по имени или офферу..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald" />
        </div>
        <div className="flex rounded-lg border border-border bg-surface p-0.5 overflow-x-auto">
          {statuses.map((s) => (
            <button key={s} onClick={() => setActiveStatus(s)}
              className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition-colors', activeStatus === s ? 'bg-emerald/15 text-emerald' : 'text-muted-foreground hover:text-foreground')}>
              {s === 'ALL' ? 'Все' : statusLabels[s]}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border border-border bg-surface p-0.5">
          <button onClick={() => setView('table')} className={cn('rounded-md p-1.5', view === 'table' ? 'bg-emerald/15 text-emerald' : 'text-muted-foreground')}><List className="h-4 w-4" /></button>
          <button onClick={() => setView('kanban')} className={cn('rounded-md p-1.5', view === 'kanban' ? 'bg-emerald/15 text-emerald' : 'text-muted-foreground')}><LayoutGrid className="h-4 w-4" /></button>
        </div>
      </div>

      {view === 'table' ? (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Лид</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Контакты</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Оффер</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Статус</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">AI Score</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Сумма</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr key={lead.id} className="border-b border-border/50 hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald/10 text-[10px] font-semibold text-emerald">
                          {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">{lead.source} • {new Date(lead.created_at).toLocaleDateString('ru-RU')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {lead.phone && <Phone className="h-3.5 w-3.5 text-muted-foreground" />}
                        {lead.telegram && <MessageCircle className="h-3.5 w-3.5 text-blue-400" />}
                        {lead.email && <Mail className="h-3.5 w-3.5 text-muted-foreground" />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground">{lead.offer}</p>
                      <p className="text-xs text-muted-foreground">{lead.offer_category}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-medium', statusColors[lead.status] || '')}>
                        {statusLabels[lead.status] || lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="relative h-8 w-8 shrink-0">
                          <svg className="h-8 w-8 -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-surface" />
                            <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" strokeDasharray={`${(lead.ai_score || 0) * 0.94} 100`} strokeLinecap="round" style={{ stroke: getScoreColor(lead.ai_score || 0) }} />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold" style={{ color: getScoreColor(lead.ai_score || 0) }}>{lead.ai_score || 0}</span>
                        </div>
                        <div className="min-w-0">
                          {lead.lead_temperature && (
                            <span className="rounded-full px-1.5 py-0.5 text-[9px] font-medium" style={{ background: TEMPERATURE_CONFIG[lead.lead_temperature].bg, color: TEMPERATURE_CONFIG[lead.lead_temperature].color }}>
                              {TEMPERATURE_CONFIG[lead.lead_temperature].emoji} {TEMPERATURE_CONFIG[lead.lead_temperature].label}
                            </span>
                          )}
                          {lead.ai_probability != null && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">{lead.ai_probability}% закрытие</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gold">{(lead.amount || 0).toLocaleString('ru-RU')}₽</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {lead.image_url && (
                          <a href={lead.image_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md hover:bg-surface text-muted-foreground hover:text-blue-400">
                            <ImageIcon className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button onClick={() => setEditLead(lead)} className="p-1.5 rounded-md hover:bg-surface text-muted-foreground hover:text-foreground"><Edit className="h-3.5 w-3.5" /></button>
                        {auth.isAdmin && <button onClick={() => handleDelete(lead.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kanbanStatuses.map((status) => {
            const items = leadsList.filter((l) => l.status === status);
            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={cn('rounded-full px-3 py-1 text-xs font-medium', statusColors[status])}>{statusLabels[status]}</span>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
                {items.map((lead) => (
                  <div key={lead.id} className="glass-card p-4 hover:glow-emerald transition-all cursor-pointer space-y-2" onClick={() => setEditLead(lead)}>
                    {!auth.isAdmin && (
                      <div className="mb-2">
                        {getLeadTips(lead).map((tip, i) => (
                          <div key={i} className="flex items-start gap-1.5 mb-1">
                            <Lightbulb className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" />
                            <span className="text-[10px] text-amber-400">{tip}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{lead.name}</p>
                      <span className="text-xs font-semibold text-gold">{(lead.amount || 0).toLocaleString('ru-RU')}₽</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{lead.offer}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{lead.source}</span>
                      <div className="flex items-center gap-1.5">
                        {lead.lead_temperature && (
                          <span className="text-[10px]">{TEMPERATURE_CONFIG[lead.lead_temperature].emoji}</span>
                        )}
                        <span className="font-bold" style={{ color: getScoreColor(lead.ai_score || 0) }}>{lead.ai_score || 0}</span>
                        {lead.ai_probability != null && (
                          <span className="text-muted-foreground">({lead.ai_probability}%)</span>
                        )}
                      </div>
                    </div>
                    {lead.ai_flags && lead.ai_flags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {lead.ai_flags.slice(0, 2).map((flag, i) => (
                          <span key={i} className="rounded-full bg-destructive/15 px-1.5 py-0.5 text-[9px] text-destructive">{flag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <AddLeadModalDB open={showAddModal} onOpenChange={setShowAddModal} onSuccess={fetchLeads} userId={auth.user?.id || ''} isAdmin={auth.isAdmin} />
      {editLead && <EditLeadModal lead={editLead} onClose={() => setEditLead(null)} onSuccess={fetchLeads} isAdmin={auth.isAdmin} />}
    </div>
  );
}

function AddLeadModalDB({ open, onOpenChange, onSuccess, userId, isAdmin }: { open: boolean; onOpenChange: (o: boolean) => void; onSuccess: () => void; userId: string; isAdmin: boolean }) {
  const [form, setForm] = useState({ name: '', phone: '', telegram: '', email: '', source: 'Реклама', offer: '', offer_id: '', offer_category: '', amount: '', comment: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [teamOffers, setTeamOffers] = useState<{ id: string; name: string; category: string; payout: number | null; payout_min: number | null; payout_max: number | null }[]>([]);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Load user's team and team offers
  useEffect(() => {
    if (!open || !userId) return;
    (async () => {
      const sb = supabase as any;
      // Get user's team_id
      const { data: profile } = await sb.from('profiles').select('team_id').eq('user_id', userId).maybeSingle();
      const teamId = profile?.team_id || null;
      setUserTeamId(teamId);
      if (teamId) {
        const { data: offers } = await sb.from('offers').select('id,name,category,payout,payout_min,payout_max').eq('team_id', teamId).eq('status', 'active').order('category');
        setTeamOffers((offers as any[]) || []);
      } else if (isAdmin) {
        // If no team but user is admin, load all active offers
        const { data: offers } = await sb.from('offers').select('id,name,category,payout,payout_min,payout_max').eq('status', 'active').order('category');
        setTeamOffers((offers as any[]) || []);
      } else {
        // Regular user with no team sees NO offers
        setTeamOffers([]);
      }
    })();
  }, [open, userId, isAdmin]);

  const handleOfferSelect = (offerId: string) => {
    if (!offerId) {
      setForm(f => ({ ...f, offer: '', offer_id: '', offer_category: '', amount: '' }));
      return;
    }
    const found = teamOffers.find(o => o.id === offerId);
    if (found) {
      setForm(f => ({
        ...f,
        offer: found.name,
        offer_id: found.id,
        offer_category: found.category,
        amount: String(found.payout || found.payout_min || 0),
      }));
    }
  };

  // Group offers by category for the dropdown
  const offersByCategory = teamOffers.reduce<Record<string, typeof teamOffers>>((acc, o) => {
    const cat = o.category || 'OTHER';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(o);
    return acc;
  }, {});

  const handleSubmit = async () => {
    if (!form.name) return;
    setLoading(true);
    let imageUrl = '';
    if (imageFile) {
      const ext = imageFile.name.split('.').pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('lead-attachments').upload(path, imageFile);
      if (!upErr) {
        const { data: pub } = supabase.storage.from('lead-attachments').getPublicUrl(path);
        imageUrl = pub.publicUrl;
      }
    }
    const insertPayload: any = {
      name: form.name, phone: form.phone, telegram: form.telegram, email: form.email,
      source: form.source, offer: form.offer, offer_category: form.offer_category || null,
      amount: Number(form.amount) || 0,
      comment: form.comment, created_by: userId,
      image_url: imageUrl,
    };
    if (userTeamId) insertPayload.team_id = userTeamId;
    const { error } = await supabase.from('leads').insert(insertPayload);
    setLoading(false);
    if (error) { toast.error('Ошибка создания лида'); return; }
    toast.success('Лид создан');
    setForm({ name: '', phone: '', telegram: '', email: '', source: 'Telegram', offer: '', offer_id: '', offer_category: '', amount: '', comment: '' });
    setImageFile(null);
    onOpenChange(false);
    onSuccess();
  };

  const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald";
  const labelClass = "text-xs font-medium text-muted-foreground mb-1 block";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-foreground">Новый лид</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2"><label className={labelClass}>ФИО *</label><input className={inputClass} placeholder="Иванов Алексей" value={form.name} onChange={(e) => update('name', e.target.value)} /></div>
          <div><label className={labelClass}>Телефон</label><input className={inputClass} placeholder="+7 (999) 123-45-67" value={form.phone} onChange={(e) => update('phone', e.target.value)} /></div>
          <div><label className={labelClass}>Telegram</label><input className={inputClass} placeholder="@username" value={form.telegram} onChange={(e) => update('telegram', e.target.value)} /></div>
          <div className="col-span-2"><label className={labelClass}>Email</label><input className={inputClass} type="email" placeholder="email@mail.ru" value={form.email} onChange={(e) => update('email', e.target.value)} /></div>
          <div><label className={labelClass}>Источник</label><select className={inputClass} value={form.source} onChange={(e) => update('source', e.target.value)}>{sources.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
          <div>
            <label className={labelClass}>Оффер</label>
            <select className={inputClass} value={form.offer_id} onChange={(e) => handleOfferSelect(e.target.value)}>
              <option value="">— Выберите оффер —</option>
              {Object.entries(offersByCategory).map(([cat, items]) => (
                <optgroup key={cat} label={cat}>
                  {items.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.payout || o.payout_min || 0}₽)
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {form.offer_category && (
              <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald/15 text-emerald">{form.offer_category}</span>
            )}
          </div>
          <div><label className={labelClass}>Сумма (₽)</label><input className={inputClass} type="number" placeholder="1500" value={form.amount} onChange={(e) => update('amount', e.target.value)} /></div>
          <div className="col-span-2">
            <label className={labelClass}>Изображение</label>
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-emerald/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-emerald hover:file:bg-emerald/20" />
          </div>
          <div className="col-span-2"><label className={labelClass}>Комментарий</label><textarea className={inputClass + " min-h-[60px] resize-none"} placeholder="Комментарий..." value={form.comment} onChange={(e) => update('comment', e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button className="bg-emerald text-emerald-foreground hover:opacity-90" onClick={handleSubmit} disabled={loading}>{loading ? '...' : 'Создать'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditLeadModal({ lead, onClose, onSuccess, isAdmin }: { lead: DbLead; onClose: () => void; onSuccess: () => void; isAdmin: boolean }) {
  const [form, setForm] = useState({
    name: lead.name, phone: lead.phone || '', telegram: lead.telegram || '', email: lead.email || '',
    source: lead.source || '', offer: lead.offer || '', amount: String(lead.amount || 0),
    comment: lead.comment || '', status: lead.status,
  });
  const [loading, setLoading] = useState(false);
  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Live AI preview
  const liveAI = useMemo(() => {
    return analyzeLeadAI({ ...lead, ...form, amount: Number(form.amount) || 0 });
  }, [form, lead]);

  const handleSave = async () => {
    setLoading(true);
    const ai = analyzeLeadAI({ ...lead, ...form, amount: Number(form.amount) || 0 });
    const { error } = await supabase.from('leads').update({
      name: form.name, phone: form.phone, telegram: form.telegram, email: form.email,
      source: form.source, offer: form.offer, amount: Number(form.amount) || 0,
      comment: form.comment, status: form.status as "NEW" | "IN_PROGRESS" | "SUCCESS" | "REJECTED",
      ai_score: ai.ai_score,
    }).eq('id', lead.id);
    setLoading(false);
    if (error) { toast.error('Ошибка сохранения'); return; }
    toast.success('Лид обновлён');
    onClose();
    onSuccess();
  };

  const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald";
  const labelClass = "text-xs font-medium text-muted-foreground mb-1 block";
  const tempCfg = TEMPERATURE_CONFIG[liveAI.lead_temperature];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-foreground">Редактировать лид</DialogTitle></DialogHeader>

        {/* AI Analysis Panel */}
        <div className="rounded-xl border border-border bg-surface/50 p-4 mb-2">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="h-4 w-4 text-emerald" />
            <span className="text-xs font-semibold text-foreground">AI Анализ (live)</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {/* Score circle */}
            <div className="flex flex-col items-center">
              <div className="relative h-14 w-14">
                <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-border" />
                  <circle cx="18" cy="18" r="15" fill="none" strokeWidth="2.5" strokeDasharray={`${liveAI.ai_score * 0.94} 100`} strokeLinecap="round" style={{ stroke: getScoreColor(liveAI.ai_score) }} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color: getScoreColor(liveAI.ai_score) }}>{liveAI.ai_score}</span>
              </div>
              <span className="text-[10px] text-muted-foreground mt-1">AI Score</span>
            </div>
            {/* Temperature */}
            <div className="flex flex-col items-center justify-center">
              <span className="text-2xl">{tempCfg.emoji}</span>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-medium mt-1" style={{ background: tempCfg.bg, color: tempCfg.color }}>{tempCfg.label}</span>
            </div>
            {/* Probability */}
            <div className="flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-foreground">{liveAI.ai_probability}%</span>
              <span className="text-[10px] text-muted-foreground">Вероятность закрытия</span>
            </div>
          </div>
          {/* Recommendations */}
          {liveAI.ai_recommendations.length > 0 && (
            <div className="space-y-1.5">
              {liveAI.ai_recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <Lightbulb className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" />
                  <span className="text-[11px] text-amber-400">{rec}</span>
                </div>
              ))}
            </div>
          )}
          {/* Flags */}
          {liveAI.ai_flags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {liveAI.ai_flags.map((flag, i) => (
                <span key={i} className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-medium text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-2.5 w-2.5" />{flag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2"><label className={labelClass}>ФИО</label><input className={inputClass} value={form.name} onChange={(e) => update('name', e.target.value)} /></div>
          <div><label className={labelClass}>Телефон</label><input className={inputClass} value={form.phone} onChange={(e) => update('phone', e.target.value)} /></div>
          <div><label className={labelClass}>Telegram</label><input className={inputClass} value={form.telegram} onChange={(e) => update('telegram', e.target.value)} /></div>
          <div className="col-span-2"><label className={labelClass}>Email</label><input className={inputClass} value={form.email} onChange={(e) => update('email', e.target.value)} /></div>
          <div><label className={labelClass}>Источник</label><input className={inputClass} value={form.source} onChange={(e) => update('source', e.target.value)} readOnly={!isAdmin} /></div>
          <div><label className={labelClass}>Оффер</label><input className={inputClass} value={form.offer} onChange={(e) => update('offer', e.target.value)} readOnly={!isAdmin} /></div>
          <div><label className={labelClass}>Сумма</label><input className={inputClass} type="number" value={form.amount} onChange={(e) => update('amount', e.target.value)} readOnly={!isAdmin} /></div>
          <div><label className={labelClass}>Статус</label>
            <select className={inputClass} value={form.status} onChange={(e) => update('status', e.target.value)}>
              <option value="NEW">Новый</option><option value="IN_PROGRESS">В работе</option>
              <option value="SUCCESS">Успех</option><option value="REJECTED">Отказ</option>
            </select>
          </div>
          <div className="col-span-2"><label className={labelClass}>Комментарий</label><textarea className={inputClass + " min-h-[60px] resize-none"} value={form.comment} onChange={(e) => update('comment', e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button className="bg-emerald text-emerald-foreground hover:opacity-90" onClick={handleSave} disabled={loading}>{loading ? '...' : 'Сохранить'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}