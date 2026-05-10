import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { toast } from 'sonner';
import { useServerFn } from '@tanstack/react-start';
import { redeemAccessKey } from '@/lib/team-actions.functions';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [loading, setLoading] = useState(false);
  const redeemFn = useServerFn(redeemAccessKey);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        // If session is available immediately (auto-confirm), try redeem key
        const { data: sess } = await supabase.auth.getSession();
        if (sess.session && accessKey.trim()) {
          try {
            const res = await redeemFn({ data: { key: accessKey.trim(), token: sess.session.access_token } });
            toast.success(`Ключ применён! Вы в команде ${res.team_name || 'без названия'}, роль: ${res.role}`);
          } catch (err: any) {
            toast.error('Регистрация прошла, но ключ не применён: ' + (err?.message || ''));
          }
          navigate({ to: '/' });
        } else if (accessKey.trim()) {
          toast.success('Подтвердите email и войдите — ключ примените в профиле');
        } else {
          toast.success('Проверьте email для подтверждения регистрации');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (accessKey.trim() && data.session) {
          try { 
            const res = await redeemFn({ data: { key: accessKey.trim(), token: data.session.access_token } }); 
            toast.success(`Ключ применён! Вы в команде ${res.team_name || 'без названия'}, роль: ${res.role}`);
          } catch (err: any) { 
            toast.error(err?.message || 'Ключ не применён'); 
          }
        }
        navigate({ to: '/' });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error('Ошибка входа через Google');
      return;
    }
    if (result.redirected) return;
    navigate({ to: '/' });
  };

  const inputClass = 'w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald/50 transition-all';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald font-bold text-emerald-foreground text-2xl glow-emerald">
            RS
          </div>
          <h1 className="mt-6 text-3xl font-bold text-foreground tracking-tight">Rko System</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === 'login' ? 'Войдите в свой аккаунт' : 'Создайте новый аккаунт'}
          </p>
        </div>

        <div className="glass-card p-8 space-y-6">
          <button
            onClick={handleGoogle}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium text-foreground hover:bg-surface-hover transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Войти через Google
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">или</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <input className={inputClass} placeholder="Имя" value={name} onChange={(e) => setName(e.target.value)} required />
            )}
            <input className={inputClass} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className={inputClass} type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            <input className={inputClass} placeholder={mode === 'register' ? 'Код доступа (опционально)' : 'Код доступа (если есть)'} value={accessKey} onChange={(e) => setAccessKey(e.target.value)} />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald px-4 py-3 text-sm font-semibold text-emerald-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? '...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {mode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
            <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-emerald font-medium hover:underline">
              {mode === 'login' ? 'Регистрация' : 'Войти'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}