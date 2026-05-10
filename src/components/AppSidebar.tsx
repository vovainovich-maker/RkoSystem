import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import {
  LayoutDashboard,
  Users,
  Target,
  Briefcase,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Building2,
  KeyRound,
  Shield,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import { useState, useEffect, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/routes/__root';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type NavItem = { label: string; icon: typeof LayoutDashboard; path: string; roles?: string[] };
const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Лиды', icon: Target, path: '/leads' },
  { label: 'Офферы', icon: Briefcase, path: '/offers' },
  { label: 'Команды', icon: Building2, path: '/teams', roles: ['admin', 'super_admin'] },
  { label: 'Моя команда', icon: Shield, path: '/my-team', roles: ['team_lead', 'owner_team'] },
  { label: 'Пользователи', icon: Users, path: '/users', roles: ['admin', 'super_admin'] },
  { label: 'Ключи доступа', icon: KeyRound, path: '/access-keys', roles: ['admin', 'super_admin', 'team_lead'] },
  { label: 'Аналитика', icon: BarChart3, path: '/analytics' },
  { label: 'Уведомления', icon: Bell, path: '/notifications' },
  { label: 'Настройки', icon: Settings, path: '/settings', roles: ['admin', 'super_admin'] },
];

const MobileMenuContext = createContext<{
  open: boolean;
  setOpen: (v: boolean) => void;
}>({ open: false, setOpen: () => {} });

export function MobileMenuProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <MobileMenuContext.Provider value={{ open, setOpen }}>
      {children}
    </MobileMenuContext.Provider>
  );
}

export function useMobileMenu() {
  return useContext(MobileMenuContext);
}

function NavLinks({ onNavigate, collapsed, role }: { onNavigate?: () => void; collapsed?: boolean; role?: string | null }) {
  const location = useLocation();
  const allowed = (item: NavItem) => !item.roles || (role ? item.roles.includes(role) : false);
  return (
    <>
      {navItems.filter(allowed).map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path as any}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-emerald/15 text-emerald glow-emerald'
                : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
            )}
          >
            <item.icon className={cn('h-[18px] w-[18px] shrink-0', isActive && 'text-emerald')} />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        );
      })}
    </>
  );
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const auth = useAuthContext();
  const navigate = useNavigate();
  const initials = (auth.profile as Record<string, string> | null)?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 max-md:hidden',
        collapsed ? 'w-[68px]' : 'w-[240px]'
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald font-bold text-emerald-foreground text-sm">RS</div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-foreground tracking-tight">Rko System</h1>
            <p className="text-[10px] text-muted-foreground">CRM Platform</p>
          </div>
        )}
      </div>
      <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
        <NavLinks collapsed={collapsed} role={auth.role} />
      </nav>
      <div className="border-t border-sidebar-border p-2">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald/20 text-xs font-semibold text-emerald">{initials}</div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-medium text-foreground truncate">{(auth.profile as Record<string, string> | null)?.name || 'User'}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{auth.role || 'user'}</p>
            </div>
          )}
          {!collapsed && <LogOut className="h-4 w-4 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer" onClick={() => { auth.signOut(); navigate({ to: '/login' }); }} />}
        </div>
        <button onClick={() => setCollapsed(!collapsed)} className="mt-1 flex w-full items-center justify-center rounded-lg py-2 text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}

export function MobileDrawer() {
  const { open, setOpen } = useMobileMenu();
  const auth = useAuthContext();
  const navigate = useNavigate();
  const initials = (auth.profile as Record<string, string> | null)?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setOpen(false)} />
      )}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 md:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald font-bold text-emerald-foreground text-xs">RS</div>
            <div>
              <h1 className="text-sm font-bold text-foreground tracking-tight">Rko System</h1>
              <p className="text-[10px] text-muted-foreground">CRM Platform</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="p-1 text-muted-foreground">
            <X className="h-6 w-6 text-foreground" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
          <NavLinks onNavigate={() => setOpen(false)} role={auth.role} />
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald/20 text-xs font-semibold text-emerald">{initials}</div>
            <div className="flex-1">
              <p className="text-xs font-medium text-foreground">{(auth.profile as Record<string, string> | null)?.name || 'User'}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{auth.role || 'user'}</p>
            </div>
            <LogOut className="h-4 w-4 shrink-0 text-muted-foreground cursor-pointer" onClick={() => { auth.signOut(); }} />
          </div>
        </div>
      </aside>
    </>
  );
}

export function MobileHeader() {
  const { setOpen } = useMobileMenu();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 backdrop-blur-md px-4 md:hidden">
      <button onClick={() => setOpen(true)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors">
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald font-bold text-emerald-foreground text-[10px]">RS</div>
        <span className="text-sm font-semibold text-foreground">Rko System</span>
      </div>
    </header>
  );
}

/**
 * ImpersonationBanner — fixed red strip at the top of the page
 * when an admin is logged in as another user.
 * Reads admin context from sessionStorage and provides return functionality.
 */
export function ImpersonationBanner() {
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [targetName, setTargetName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [returning, setReturning] = useState(false);
  const auth = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('admin_return_token');
      const name = sessionStorage.getItem('impersonate_target_name');
      const aName = sessionStorage.getItem('impersonate_admin_name');
      if (token) {
        setIsImpersonating(true);
        setTargetName(name || (auth.profile as Record<string, string> | null)?.name || 'Пользователя');
        setAdminName(aName || 'Admin');
      }
    }
  }, [auth.profile]);

  if (!isImpersonating) return null;

  const handleReturnToAdmin = async () => {
    setReturning(true);
    const returnToken = sessionStorage.getItem('admin_return_token');
    try {
      // Clean up all impersonation context
      const cleanupSession = () => {
        sessionStorage.removeItem('admin_return_token');
        sessionStorage.removeItem('impersonate_admin_id');
        sessionStorage.removeItem('impersonate_admin_name');
        sessionStorage.removeItem('impersonate_admin_role');
        sessionStorage.removeItem('impersonate_admin_email');
        sessionStorage.removeItem('impersonate_target_name');
      };

      if (!returnToken || returnToken === 'fallback_logout_only') {
        cleanupSession();
        await auth.signOut();
        window.location.replace('/login');
        return;
      }

      // Set flag to prevent redirect during session switch
      sessionStorage.setItem('impersonating', '1');
      await supabase.auth.signOut();
      await new Promise(r => setTimeout(r, 400));

      const { error } = await supabase.auth.verifyOtp({ token_hash: returnToken, type: 'magiclink' });
      sessionStorage.removeItem('impersonating');
      cleanupSession();

      if (error) throw error;

      toast.success('Возврат в админку выполнен');
      await new Promise(r => setTimeout(r, 300));
      window.location.replace('/users');
    } catch (err: any) {
      sessionStorage.removeItem('impersonating');
      setReturning(false);
      toast.error('Ошибка возврата: ' + (err?.message || 'Неизвестная ошибка'));
    }
  };

  return (
    <div className="sticky top-0 z-50 w-full bg-red-600 text-white px-4 py-2.5 flex items-center justify-between shadow-lg shadow-red-600/20">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-4 w-4 animate-pulse" />
        <span className="text-sm font-semibold">
          ⚠️ Вы вошли как <span className="font-bold underline underline-offset-2">{targetName}</span> (Impersonate Mode)
        </span>
      </div>
      <button
        onClick={handleReturnToAdmin}
        disabled={returning}
        className="flex items-center gap-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-1.5 text-xs font-bold transition-all disabled:opacity-50"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {returning ? 'Возврат...' : `Вернуться в ${adminName}`}
      </button>
    </div>
  );
}
