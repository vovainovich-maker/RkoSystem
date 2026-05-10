import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Plus, Shield, Crown, User as UserIcon, Ban, Trash2, Edit, Key } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/routes/__root';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useServerFn } from '@tanstack/react-start';
import { impersonateUserV2 } from '@/lib/team-actions.functions';

export const Route = createFileRoute('/users')({
  component: UsersPage,
});

const roleIcons: Record<string, typeof Shield> = { super_admin: Crown, admin: Crown, teamlead: Shield, user: UserIcon };
const roleColors: Record<string, string> = { super_admin: 'text-gold', admin: 'text-gold', teamlead: 'text-emerald', user: 'text-blue-400' };

interface DbProfile {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  team: string | null;
  team_id: string | null;
  status: string | null;
  is_blocked: boolean | null;
  created_at: string;
}

interface TeamOption {
  id: string;
  name: string;
  color: string | null;
}

function UsersPage() {
  const auth = useAuthContext();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<(DbProfile & { role?: string })[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<(DbProfile & { role?: string }) | null>(null);
  const impersonateFn = useServerFn(impersonateUserV2);

  useEffect(() => {
    if (!auth.isAdmin) { navigate({ to: '/' }); return; }
  }, [auth.isAdmin, navigate]);

  const fetchUsers = useCallback(async () => {
    const sb = supabase as any;
    const [{ data: profs }, { data: roles }, { data: tData }] = await Promise.all([
      sb.from('profiles').select('*').order('created_at', { ascending: false }),
      sb.from('user_roles').select('*'),
      sb.from('teams').select('id,name,color'),
    ]);
    const roleMap = new Map((roles || []).map((r: { user_id: string; role: string }) => [r.user_id, r.role]));
    setProfiles((profs || []).map((p: DbProfile) => ({ ...p, role: roleMap.get(p.user_id) || 'user' })));
    setTeams((tData as TeamOption[]) || []);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleBlock = async (userId: string, block: boolean) => {
    await supabase.from('profiles').update({ is_blocked: block }).eq('user_id', userId);
    toast.success(block ? 'Пользователь заблокирован' : 'Пользователь разблокирован');
    fetchUsers();
  };

  const handleDelete = async (userId: string) => {
    await supabase.from('profiles').delete().eq('user_id', userId);
    toast.success('Пользователь удалён');
    fetchUsers();
  };

  const handleImpersonate = async (userId: string) => {
    try {
      const res = await impersonateFn({ data: { targetUserId: userId } });

      // Save admin context BEFORE switching session
      sessionStorage.setItem('impersonating', '1');
      sessionStorage.setItem('impersonate_admin_id', auth.user!.id);
      sessionStorage.setItem('impersonate_admin_name', res.adminName || 'Admin');
      sessionStorage.setItem('impersonate_admin_role', res.adminRole || 'admin');
      sessionStorage.setItem('impersonate_admin_email', res.adminEmail || '');
      sessionStorage.setItem('impersonate_target_name', res.targetName || res.email);

      if (res.returnTokenHash) {
        sessionStorage.setItem('admin_return_token', res.returnTokenHash);
      } else {
        // Fallback — at least allow logging out and re-logging in
        sessionStorage.setItem('admin_return_token', 'fallback_logout_only');
      }

      // Sign out current admin session
      await supabase.auth.signOut();
      await new Promise((r) => setTimeout(r, 400));

      // Verify the magic link token to establish the target user's session
      const { error } = await supabase.auth.verifyOtp({ token_hash: res.tokenHash, type: 'magiclink' });
      if (error) throw error;

      // Clear the temporary flag but keep admin context
      sessionStorage.removeItem('impersonating');

      toast.success('Вход выполнен как ' + res.targetName);
      // Full page reload to re-initialize all auth state
      await new Promise(r => setTimeout(r, 500));
      window.location.replace('/');
    } catch (err: any) {
      console.error('Impersonate error:', err);
      sessionStorage.removeItem('impersonating');
      // Clean up on failure
      sessionStorage.removeItem('impersonate_admin_id');
      sessionStorage.removeItem('impersonate_admin_name');
      sessionStorage.removeItem('impersonate_admin_role');
      sessionStorage.removeItem('impersonate_admin_email');
      sessionStorage.removeItem('impersonate_target_name');
      sessionStorage.removeItem('admin_return_token');
      toast.error(err?.message || 'Не удалось войти');
    }
  };

  if (!auth.isAdmin) return null;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Пользователи</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{profiles.length} сотрудников</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-lg bg-emerald px-3 py-2 text-xs font-semibold text-emerald-foreground hover:opacity-90 transition-opacity">
          <Plus className="h-3.5 w-3.5" /> Добавить
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {profiles.map((user) => {
          const RoleIcon = roleIcons[user.role || 'user'] || UserIcon;
          const initials = user.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';
          return (
            <div key={user.id} className={cn('glass-card p-5 transition-all', user.is_blocked ? 'opacity-50' : 'hover:glow-emerald cursor-pointer')}>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald/10 text-sm font-bold text-emerald">{initials}</div>
                  <div className={cn('absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card', user.status === 'online' ? 'bg-emerald' : 'bg-muted-foreground')} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">{user.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <RoleIcon className={cn('h-3 w-3', roleColors[user.role || 'user'])} />
                    <span className={cn('text-xs font-medium capitalize', roleColors[user.role || 'user'])}>{user.role}</span>
                    {user.team && <span className="text-xs text-muted-foreground">• {user.team}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{user.email}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button onClick={() => setEditUser(user)} className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-surface px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors">
                  <Edit className="h-3 w-3" /> Редактировать
                </button>
                <button title="Войти как пользователь" onClick={() => handleImpersonate(user.user_id)} className="p-1.5 rounded-lg bg-surface text-muted-foreground hover:text-emerald hover:bg-emerald/10 transition-colors">
                  <Key className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleBlock(user.user_id, !user.is_blocked)} className="p-1.5 rounded-lg bg-surface text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
                  <Ban className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleDelete(user.user_id)} className="p-1.5 rounded-lg bg-surface text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showCreate && <CreateUserModal teams={teams} onClose={() => setShowCreate(false)} onSuccess={fetchUsers} />}
      {editUser && <EditUserModal user={editUser} teams={teams} onClose={() => setEditUser(null)} onSuccess={fetchUsers} />}
    </div>
  );
}

function CreateUserModal({ teams, onClose, onSuccess }: { teams: TeamOption[]; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'user', team_id: '' });
  const [loading, setLoading] = useState(false);
  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald";

  const handleSubmit = async () => {
    if (!form.email || !form.password || !form.name) return;
    setLoading(true);
    const sb = supabase as any;
    const { data, error } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { data: { full_name: form.name } },
    });
    if (error || !data.user) { toast.error(error?.message || 'Ошибка создания'); setLoading(false); return; }
    // Assign to team
    if (form.team_id) {
      const teamName = teams.find(t => t.id === form.team_id)?.name || '';
      await sb.from('profiles').update({ team: teamName, team_id: form.team_id }).eq('user_id', data.user.id);
      await sb.from('team_members').upsert(
        { team_id: form.team_id, user_id: data.user.id, team_role: 'member' },
        { onConflict: 'team_id,user_id' }
      );
    }
    // Update role if not default
    if (form.role !== 'user') {
      await supabase.from('user_roles').update({ role: form.role as "admin" | "super_admin" | "teamlead" | "user" }).eq('user_id', data.user.id);
    }
    setLoading(false);
    toast.success('Пользователь создан');
    onClose();
    onSuccess();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader><DialogTitle className="text-foreground">Новый пользователь</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <input className={inputClass} placeholder="Имя" value={form.name} onChange={(e) => update('name', e.target.value)} />
          <input className={inputClass} type="email" placeholder="Email" value={form.email} onChange={(e) => update('email', e.target.value)} />
          <input className={inputClass} type="password" placeholder="Пароль (мин. 6 символов)" value={form.password} onChange={(e) => update('password', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <select className={inputClass} value={form.role} onChange={(e) => update('role', e.target.value)}>
              <option value="user">User</option><option value="teamlead">TeamLead</option>
              <option value="admin">Admin</option><option value="super_admin">Super Admin</option>
            </select>
            <select className={inputClass} value={form.team_id} onChange={(e) => update('team_id', e.target.value)}>
              <option value="">Без команды</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button className="bg-emerald text-emerald-foreground hover:opacity-90" onClick={handleSubmit} disabled={loading}>{loading ? '...' : 'Создать'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditUserModal({ user, teams, onClose, onSuccess }: { user: DbProfile & { role?: string }; teams: TeamOption[]; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '', team_id: user.team_id || '', role: user.role || 'user' });
  const [loading, setLoading] = useState(false);
  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald";

  const handleSave = async () => {
    setLoading(true);
    const sb = supabase as any;
    const teamName = form.team_id ? (teams.find(t => t.id === form.team_id)?.name || '') : '';
    await sb.from('profiles').update({ name: form.name, phone: form.phone, team: teamName, team_id: form.team_id || null }).eq('user_id', user.user_id);
    // Update team_members
    if (form.team_id && form.team_id !== user.team_id) {
      // Remove from old team if any
      if (user.team_id) {
        await sb.from('team_members').delete().eq('user_id', user.user_id).eq('team_id', user.team_id);
      }
      // Add to new team
      await sb.from('team_members').upsert(
        { team_id: form.team_id, user_id: user.user_id, team_role: 'member' },
        { onConflict: 'team_id,user_id' }
      );
    } else if (!form.team_id && user.team_id) {
      // Remove from team
      await sb.from('team_members').delete().eq('user_id', user.user_id).eq('team_id', user.team_id);
    }
    if (form.role !== user.role) {
      await supabase.from('user_roles').update({ role: form.role as "admin" | "super_admin" | "teamlead" | "user" }).eq('user_id', user.user_id);
    }
    setLoading(false);
    toast.success('Пользователь обновлён');
    onClose();
    onSuccess();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader><DialogTitle className="text-foreground">Редактировать пользователя</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <input className={inputClass} placeholder="Имя" value={form.name} onChange={(e) => update('name', e.target.value)} />
          <input className={inputClass} placeholder="Телефон" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <select className={inputClass} value={form.role} onChange={(e) => update('role', e.target.value)}>
              <option value="user">User</option><option value="teamlead">TeamLead</option>
              <option value="admin">Admin</option><option value="super_admin">Super Admin</option>
            </select>
            <select className={inputClass} value={form.team_id} onChange={(e) => update('team_id', e.target.value)}>
              <option value="">Без команды</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button className="bg-emerald text-emerald-foreground hover:opacity-90" onClick={handleSave} disabled={loading}>{loading ? '...' : 'Сохранить'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}