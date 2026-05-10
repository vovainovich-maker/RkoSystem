import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/routes/__root';
import {
  Plus, Copy, KeyRound, ChevronDown, ChevronRight, Users, Clock,
  Shield, Wifi, WifiOff, Search, Power, PowerOff, RefreshCw,
  Calendar, Hash, UserPlus,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/access-keys')({ component: AccessKeysPage });

function generateKey() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return 'rks_' + Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

interface KeyUsageEntry {
  id: string;
  user_id: string | null;
  created_at: string;
  profile?: {
    name: string;
    email: string | null;
    status: string | null;
    team_id: string | null;
    avatar_url: string | null;
  } | null;
  role?: string;
  teamName?: string;
  teamColor?: string;
}

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin', admin: 'Admin', teamlead: 'Team Lead',
  team_lead: 'Team Lead', owner_team: 'Owner', user: 'User', member: 'Member',
};

function AccessKeysPage() {
  const auth = useAuthContext();
  const [keys, setKeys] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [usageMap, setUsageMap] = useState<Record<string, KeyUsageEntry[]>>({});
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [creatorMap, setCreatorMap] = useState<Map<string, string>>(new Map());

  const fetchData = useCallback(async () => {
    const sb = supabase as any;
    const [{ data: k }, { data: t }, { data: usage }] = await Promise.all([
      sb.from('access_keys').select('*').order('created_at', { ascending: false }),
      sb.from('teams').select('id,name,color'),
      sb.from('access_key_usage').select('*').order('created_at', { ascending: false }),
    ]);
    setKeys((k as any[]) || []);
    setTeams((t as any[]) || []);

    // Fetch profiles and roles for all users who used keys
    const usageRows = (usage as any[]) || [];
    const userIds = [...new Set(usageRows.map((u: any) => u.user_id).filter(Boolean))];
    // Also get creator IDs from keys
    const creatorIds = [...new Set(((k as any[]) || []).map((key: any) => key.user_id).filter(Boolean))];
    const allUserIds = [...new Set([...userIds, ...creatorIds])];

    let profMap = new Map<string, any>();
    let roleMap = new Map<string, string>();

    if (allUserIds.length > 0) {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        sb.from('profiles').select('user_id,name,email,status,team_id,avatar_url').in('user_id', allUserIds),
        sb.from('user_roles').select('user_id,role').in('user_id', allUserIds),
      ]);
      profMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      roleMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));
    }

    // Creator name map
    const cMap = new Map<string, string>();
    for (const cid of creatorIds) {
      const prof = profMap.get(cid);
      cMap.set(cid, prof?.name || prof?.email || 'Неизвестно');
    }
    setCreatorMap(cMap);

    // Build team lookup
    const teamMap = new Map(((t as any[]) || []).map((tm: any) => [tm.id, tm]));

    // Group usage by access_key_id
    const grouped: Record<string, KeyUsageEntry[]> = {};
    for (const u of usageRows) {
      if (!grouped[u.access_key_id]) grouped[u.access_key_id] = [];
      const profile = profMap.get(u.user_id);
      const team = profile?.team_id ? teamMap.get(profile.team_id) : null;
      grouped[u.access_key_id].push({
        id: u.id,
        user_id: u.user_id,
        created_at: u.created_at,
        profile,
        role: roleMap.get(u.user_id) || 'user',
        teamName: team?.name || null,
        teamColor: team?.color || null,
      });
    }
    setUsageMap(grouped);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const allowed = auth.isAdmin || auth.role === 'team_lead';
  if (!allowed) return <div className="p-6 text-muted-foreground">Нет доступа</div>;

  const teamMap = new Map(teams.map((t) => [t.id, t]));

  const toggleExpand = (keyId: string) => {
    setExpandedKey((prev) => (prev === keyId ? null : keyId));
  };

  const handleToggleActive = async (keyId: string, currentlyActive: boolean) => {
    await (supabase as any).from('access_keys').update({ active: !currentlyActive }).eq('id', keyId);
    toast.success(currentlyActive ? 'Ключ деактивирован' : 'Ключ активирован');
    fetchData();
  };

  const handleRegenerate = async (keyId: string) => {
    const newKey = generateKey();
    await (supabase as any).from('access_keys').update({ key_value: newKey, uses: 0 }).eq('id', keyId);
    toast.success('Ключ перегенерирован');
    fetchData();
  };

  // Filter keys
  const filteredKeys = keys.filter(k => {
    if (statusFilter === 'active' && !k.active) return false;
    if (statusFilter === 'inactive' && k.active) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const team = k.team_id ? teamMap.get(k.team_id) : null;
      const creatorName = k.user_id ? creatorMap.get(k.user_id) || '' : '';
      if (
        !k.key_value.toLowerCase().includes(term) &&
        !(team?.name || '').toLowerCase().includes(term) &&
        !creatorName.toLowerCase().includes(term) &&
        !(k.assigned_role || '').toLowerCase().includes(term)
      ) {
        return false;
      }
    }
    return true;
  });

  // Stats
  const totalUsers = new Set(Object.values(usageMap).flat().map(u => u.user_id).filter(Boolean)).size;
  const activeKeys = keys.filter(k => k.active).length;
  const totalActivations = keys.reduce((sum, k) => sum + (k.uses || 0), 0);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Ключи доступа</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Управление регистрационными ключами и аналитика
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex shrink-0 items-center gap-2 rounded-lg bg-emerald px-4 py-2.5 text-xs font-semibold text-emerald-foreground hover:opacity-90 transition-opacity">
          <Plus className="h-3.5 w-3.5" /> Создать ключ
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <KeyRound className="h-4 w-4" />
            <span className="text-xs">Всего ключей</span>
          </div>
          <p className="text-xl font-bold text-foreground">{keys.length}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-emerald mb-1">
            <Power className="h-4 w-4" />
            <span className="text-xs">Активные</span>
          </div>
          <p className="text-xl font-bold text-foreground">{activeKeys}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-blue-400 mb-1">
            <UserPlus className="h-4 w-4" />
            <span className="text-xs">Активаций</span>
          </div>
          <p className="text-xl font-bold text-foreground">{totalActivations}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-amber-400 mb-1">
            <Users className="h-4 w-4" />
            <span className="text-xs">Пользователей</span>
          </div>
          <p className="text-xl font-bold text-foreground">{totalUsers}</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск по ключу, команде, создателю..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald"
          />
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={cn(
                'rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                statusFilter === f
                  ? 'bg-emerald/15 text-emerald'
                  : 'bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-hover'
              )}
            >
              {f === 'all' ? 'Все' : f === 'active' ? 'Активные' : 'Отключённые'}
            </button>
          ))}
        </div>
      </div>

      {/* Keys list */}
      <div className="space-y-3">
        {filteredKeys.length === 0 && (
          <div className="glass-card p-8 text-center text-muted-foreground text-sm">
            {searchTerm || statusFilter !== 'all' ? 'Ничего не найдено' : 'Нет ключей. Создайте первый!'}
          </div>
        )}
        {filteredKeys.map((k) => {
          const team = k.team_id ? teamMap.get(k.team_id) : null;
          const usages = usageMap[k.id] || [];
          const isExpanded = expandedKey === k.id;
          const lastUsed = usages.length > 0 ? usages[0].created_at : null;
          const isExpired = k.expires_at && new Date(k.expires_at) < new Date();
          const isLimitReached = k.max_uses && k.max_uses > 0 && (k.uses || 0) >= k.max_uses;
          const creator = k.user_id ? creatorMap.get(k.user_id) : null;

          return (
            <div key={k.id} className={cn('glass-card overflow-hidden transition-all', !k.active && 'opacity-60')}>
              {/* Key header row */}
              <div
                className="p-4 flex items-center gap-3 cursor-pointer hover:bg-surface-hover/50 transition-colors"
                onClick={() => toggleExpand(k.id)}
              >
                <div className="shrink-0">
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
                <KeyRound className={cn('h-4 w-4 shrink-0', k.active ? 'text-emerald' : 'text-muted-foreground')} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-foreground">{k.key_value}</code>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(k.key_value); toast.success('Скопировано'); }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {team && <span className="text-[10px] rounded-full px-2 py-0.5 font-medium" style={{ background: (team.color || '#10b981') + '20', color: team.color || '#10b981' }}>{team.name}</span>}
                    <span className="text-[10px] rounded-full px-2 py-0.5 font-medium bg-blue-500/15 text-blue-400">{roleLabels[k.assigned_role] || k.assigned_role || 'user'}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Hash className="h-2.5 w-2.5" />
                      {k.uses || 0}{k.max_uses ? `/${k.max_uses}` : '/∞'}
                    </span>
                    {creator && <span className="text-[10px] text-muted-foreground">• Создал: {creator}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">{usages.length}</span>
                  </div>
                  {/* Status badges */}
                  {isExpired ? (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-500/20 text-amber-400">Истёк</span>
                  ) : isLimitReached ? (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-500/20 text-amber-400">Лимит</span>
                  ) : (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${k.active ? 'bg-emerald/20 text-emerald' : 'bg-destructive/20 text-destructive'}`}>
                      {k.active ? 'Активен' : 'Отключён'}
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-border">
                  {/* Key info row */}
                  <div className="px-4 py-3 bg-surface/30 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Создан: {new Date(k.created_at).toLocaleDateString('ru-RU')}
                    </span>
                    {k.expires_at && (
                      <span className={cn('flex items-center gap-1', isExpired && 'text-amber-400')}>
                        <Clock className="h-3 w-3" />
                        Истекает: {new Date(k.expires_at).toLocaleDateString('ru-RU')}
                      </span>
                    )}
                    {lastUsed && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Последняя активация: {new Date(lastUsed).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })}{' '}
                        {new Date(lastUsed).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    <div className="flex-1" />
                    {/* Quick actions */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleActive(k.id, k.active); }}
                      className={cn('flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-colors',
                        k.active
                          ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                          : 'bg-emerald/10 text-emerald hover:bg-emerald/20'
                      )}
                    >
                      {k.active ? <PowerOff className="h-3 w-3" /> : <Power className="h-3 w-3" />}
                      {k.active ? 'Деактивировать' : 'Активировать'}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRegenerate(k.id); }}
                      className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Перегенерировать
                    </button>
                  </div>

                  {/* Usage list */}
                  {usages.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">Никто ещё не использовал этот ключ</div>
                  ) : (
                    <div className="divide-y divide-border/50">
                      {/* Table header */}
                      <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-3 px-4 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium bg-surface/50">
                        <span>Пользователь</span>
                        <span>Команда</span>
                        <span>Роль</span>
                        <span>Статус</span>
                        <span>Дата входа</span>
                      </div>
                      {usages.map((u) => {
                        const initials = u.profile?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';
                        const isOnline = u.profile?.status === 'online';
                        return (
                          <div key={u.id} className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-3 px-4 py-3 items-center hover:bg-surface-hover/50 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative shrink-0">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald/10 text-[10px] font-bold text-emerald">
                                  {initials}
                                </div>
                                <div className={cn('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card', isOnline ? 'bg-emerald' : 'bg-muted-foreground')} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{u.profile?.name || 'Без имени'}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{u.profile?.email || '—'}</p>
                              </div>
                            </div>
                            <div className="min-w-0">
                              {u.teamName ? (
                                <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: (u.teamColor || '#10b981') + '20', color: u.teamColor || '#10b981' }}>
                                  {u.teamName}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                            <div>
                              <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-blue-500/15 text-blue-400">
                                {roleLabels[u.role || 'user'] || u.role}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {isOnline ? (
                                <>
                                  <Wifi className="h-3 w-3 text-emerald" />
                                  <span className="text-[10px] text-emerald font-medium">Online</span>
                                </>
                              ) : (
                                <>
                                  <WifiOff className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-[10px] text-muted-foreground">Offline</span>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                              <Clock className="h-3 w-3" />
                              {new Date(u.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })}{' '}
                              {new Date(u.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showAdd && <CreateKeyModal teams={teams} onClose={() => setShowAdd(false)} onSuccess={fetchData} userId={auth.user!.id} />}
    </div>
  );
}

function CreateKeyModal({ teams, onClose, onSuccess, userId }: { teams: any[]; onClose: () => void; onSuccess: () => void; userId: string }) {
  const [form, setForm] = useState({ team_id: '', assigned_role: 'user', max_uses: '0', expires_days: '0' });
  const [loading, setLoading] = useState(false);
  const inputClass = 'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-emerald';

  const handleCreate = async () => {
    setLoading(true);
    const expiresAt = Number(form.expires_days) > 0
      ? new Date(Date.now() + Number(form.expires_days) * 86400000).toISOString()
      : null;

    const { error } = await (supabase as any).from('access_keys').insert({
      key_value: generateKey(),
      user_id: userId,
      team_id: form.team_id || null,
      assigned_role: form.assigned_role,
      max_uses: Number(form.max_uses) || 0,
      expires_at: expiresAt,
      active: true,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Ключ создан'); onClose(); onSuccess();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader><DialogTitle className="text-foreground">Новый ключ доступа</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Команда</label>
            <select className={inputClass} value={form.team_id} onChange={(e) => setForm({ ...form, team_id: e.target.value })}>
              <option value="">Без команды</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Роль</label>
            <select className={inputClass} value={form.assigned_role} onChange={(e) => setForm({ ...form, assigned_role: e.target.value })}>
              <option value="user">User</option>
              <option value="team_lead">Team Lead</option>
              <option value="owner_team">Owner Team</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Макс. активаций (0 = ∞)</label>
              <input className={inputClass} type="number" min="0" placeholder="0" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Срок действия (дней, 0 = ∞)</label>
              <input className={inputClass} type="number" min="0" placeholder="0" value={form.expires_days} onChange={(e) => setForm({ ...form, expires_days: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button className="bg-emerald text-emerald-foreground hover:opacity-90" onClick={handleCreate} disabled={loading}>{loading ? '...' : 'Создать'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}