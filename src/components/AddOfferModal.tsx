import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { type Offer } from '@/lib/mock-data';

interface AddOfferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (offer: Offer) => void;
}

const categories = ['RKO', 'CREDIT', 'DEBIT', 'REGBIZ', 'MFO', 'HR'] as const;

export function AddOfferModal({ open, onOpenChange, onAdd }: AddOfferModalProps) {
  const [form, setForm] = useState({
    name: '', category: 'RKO' as Offer['category'], rate: '0%', payout: '', geo: 'РФ',
  });

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = () => {
    if (!form.name || !form.payout) return;
    const offer: Offer = {
      id: `O-${Date.now()}`,
      name: form.name,
      category: form.category,
      rate: form.rate,
      payout: Number(form.payout),
      geo: form.geo,
      status: 'active',
    };
    onAdd(offer);
    setForm({ name: '', category: 'RKO', rate: '0%', payout: '', geo: 'РФ' });
    onOpenChange(false);
  };

  const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald";
  const labelClass = "text-xs font-medium text-muted-foreground mb-1 block";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Добавить оффер</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className={labelClass}>Название *</label>
            <input className={inputClass} placeholder="Альфа Банк РКО" value={form.name} onChange={(e) => update('name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Категория</label>
              <select className={inputClass} value={form.category} onChange={(e) => update('category', e.target.value)}>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Ставка</label>
              <input className={inputClass} placeholder="0%" value={form.rate} onChange={(e) => update('rate', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Выплата (₽) *</label>
              <input className={inputClass} type="number" placeholder="1500" value={form.payout} onChange={(e) => update('payout', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Гео</label>
              <input className={inputClass} placeholder="РФ" value={form.geo} onChange={(e) => update('geo', e.target.value)} />
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