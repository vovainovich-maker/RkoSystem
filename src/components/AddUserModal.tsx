import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { type User } from '@/lib/mock-data';

interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (user: User) => void;
}

const roles = ['USER', 'TEAMLEAD', 'ADMIN', 'SUPER_ADMIN'] as const;
const teams = ['Alpha', 'Beta', 'Gamma'];

export function AddUserModal({ open, onOpenChange, onAdd }: AddUserModalProps) {
  const [form, setForm] = useState({
    name: '', role: 'USER' as User['role'], team: 'Alpha',
  });

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = () => {
    if (!form.name) return;
    const initials = form.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
    const user: User = {
      id: `U-${Date.now()}`,
      name: form.name,
      role: form.role,
      team: form.team,
      leads: 0,
      revenue: 0,
      conversion: 0,
      status: 'online',
      avatar: initials,
    };
    onAdd(user);
    setForm({ name: '', role: 'USER', team: 'Alpha' });
    onOpenChange(false);
  };

  const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald";
  const labelClass = "text-xs font-medium text-muted-foreground mb-1 block";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Добавить пользователя</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className={labelClass}>ФИО *</label>
            <input className={inputClass} placeholder="Иванов Алексей" value={form.name} onChange={(e) => update('name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Роль</label>
              <select className={inputClass} value={form.role} onChange={(e) => update('role', e.target.value)}>
                {roles.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Команда</label>
              <select className={inputClass} value={form.team} onChange={(e) => update('team', e.target.value)}>
                {teams.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button className="bg-emerald text-emerald-foreground hover:opacity-90" onClick={handleSubmit}>Добавить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}