import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { type Lead, offers, users } from '@/lib/mock-data';

interface AddLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (lead: Lead) => void;
}

const sources = ['Telegram', 'Avito', 'Yandex', 'VK', 'Direct', 'Organic', 'Referral'];

export function AddLeadModal({ open, onOpenChange, onAdd }: AddLeadModalProps) {
  const [form, setForm] = useState({
    name: '', phone: '', telegram: '', email: '', source: 'Telegram',
    offer: offers[0]?.name || '', manager: users[0]?.name || '', amount: '', comment: '',
  });

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = () => {
    if (!form.name || !form.phone) return;
    const offerObj = offers.find((o) => o.name === form.offer);
    const lead: Lead = {
      id: `L-${Date.now()}`,
      name: form.name,
      phone: form.phone,
      telegram: form.telegram,
      email: form.email,
      source: form.source,
      offer: form.offer,
      offerCategory: offerObj?.category || 'RKO',
      manager: form.manager,
      status: 'NEW',
      amount: Number(form.amount) || 0,
      aiScore: Math.floor(Math.random() * 40) + 50,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      comment: form.comment,
    };
    onAdd(lead);
    setForm({ name: '', phone: '', telegram: '', email: '', source: 'Telegram', offer: offers[0]?.name || '', manager: users[0]?.name || '', amount: '', comment: '' });
    onOpenChange(false);
  };

  const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald";
  const labelClass = "text-xs font-medium text-muted-foreground mb-1 block";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Новый лид</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2">
            <label className={labelClass}>ФИО *</label>
            <input className={inputClass} placeholder="Иванов Алексей" value={form.name} onChange={(e) => update('name', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Телефон *</label>
            <input className={inputClass} placeholder="+7 (999) 123-45-67" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Telegram</label>
            <input className={inputClass} placeholder="@username" value={form.telegram} onChange={(e) => update('telegram', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Email</label>
            <input className={inputClass} type="email" placeholder="email@mail.ru" value={form.email} onChange={(e) => update('email', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Источник</label>
            <select className={inputClass} value={form.source} onChange={(e) => update('source', e.target.value)}>
              {sources.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Оффер</label>
            <select className={inputClass} value={form.offer} onChange={(e) => update('offer', e.target.value)}>
              {offers.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Менеджер</label>
            <select className={inputClass} value={form.manager} onChange={(e) => update('manager', e.target.value)}>
              {users.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Сумма (₽)</label>
            <input className={inputClass} type="number" placeholder="1500" value={form.amount} onChange={(e) => update('amount', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Комментарий</label>
            <textarea className={inputClass + " min-h-[60px] resize-none"} placeholder="Комментарий к лиду..." value={form.comment} onChange={(e) => update('comment', e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button className="bg-emerald text-emerald-foreground hover:opacity-90" onClick={handleSubmit}>Создать лид</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}