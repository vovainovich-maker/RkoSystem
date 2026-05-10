export interface Lead {
  id: string;
  name: string;
  phone: string;
  telegram: string;
  email: string;
  source: string;
  offer: string;
  offerCategory: string;
  manager: string;
  status: 'NEW' | 'IN_PROGRESS' | 'SUCCESS' | 'REJECTED';
  amount: number;
  aiScore: number;
  createdAt: string;
  comment: string;
}

export interface Offer {
  id: string;
  name: string;
  category: 'RKO' | 'CREDIT' | 'DEBIT' | 'REGBIZ' | 'MFO' | 'HR';
  rate: string;
  payout: number;
  geo: string;
  status: 'active' | 'paused';
}

export interface User {
  id: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'TEAMLEAD' | 'USER';
  team: string;
  leads: number;
  revenue: number;
  conversion: number;
  status: 'online' | 'offline';
  avatar: string;
}

export const leads: Lead[] = [
  { id: 'L-001', name: 'Иванов Алексей', phone: '+7 (999) 123-45-67', telegram: '@ivanov_a', email: 'ivanov@mail.ru', source: 'Telegram', offer: 'Альфа Банк РКО', offerCategory: 'RKO', manager: 'Петров М.', status: 'NEW', amount: 1500, aiScore: 87, createdAt: '2026-05-01 10:23', comment: 'Интересуется РКО для ИП' },
  { id: 'L-002', name: 'Смирнова Елена', phone: '+7 (916) 234-56-78', telegram: '@smirnova_e', email: 'elena@gmail.com', source: 'Avito', offer: 'Т-Банк кредитка', offerCategory: 'CREDIT', manager: 'Козлов А.', status: 'IN_PROGRESS', amount: 900, aiScore: 72, createdAt: '2026-05-01 09:15', comment: 'Нужна кредитная карта с кэшбэком' },
  { id: 'L-003', name: 'Козлов Дмитрий', phone: '+7 (925) 345-67-89', telegram: '@kozlov_d', email: 'kozlov@yandex.ru', source: 'Yandex', offer: 'Сбер кредитка', offerCategory: 'CREDIT', manager: 'Петров М.', status: 'SUCCESS', amount: 1200, aiScore: 95, createdAt: '2026-04-30 15:42', comment: 'Оформлен' },
  { id: 'L-004', name: 'Попова Анна', phone: '+7 (903) 456-78-90', telegram: '@popova_a', email: 'anna@mail.ru', source: 'VK', offer: 'ВТБ дебетовая карта', offerCategory: 'DEBIT', manager: 'Сидоров К.', status: 'REJECTED', amount: 500, aiScore: 23, createdAt: '2026-04-30 11:30', comment: 'Не заинтересована' },
  { id: 'L-005', name: 'Новиков Сергей', phone: '+7 (926) 567-89-01', telegram: '@novikov_s', email: 'novikov@gmail.com', source: 'Telegram', offer: 'Точка Банк РКО', offerCategory: 'RKO', manager: 'Козлов А.', status: 'NEW', amount: 1500, aiScore: 64, createdAt: '2026-05-01 11:05', comment: 'Переводит бизнес из другого банка' },
  { id: 'L-006', name: 'Морозова Ольга', phone: '+7 (915) 678-90-12', telegram: '@morozova_o', email: 'olga@yandex.ru', source: 'Direct', offer: 'Альфа Банк кредитка', offerCategory: 'CREDIT', manager: 'Петров М.', status: 'IN_PROGRESS', amount: 1000, aiScore: 78, createdAt: '2026-05-01 08:50', comment: 'Высокий доход, хороший скоринг' },
  { id: 'L-007', name: 'Волков Андрей', phone: '+7 (977) 789-01-23', telegram: '@volkov_a', email: 'volkov@mail.ru', source: 'Organic', offer: 'Газпромбанк РКО', offerCategory: 'RKO', manager: 'Сидоров К.', status: 'SUCCESS', amount: 1300, aiScore: 91, createdAt: '2026-04-29 16:20', comment: 'ООО, оборот 3 млн/мес' },
  { id: 'L-008', name: 'Лебедева Мария', phone: '+7 (964) 890-12-34', telegram: '@lebedeva_m', email: 'maria@gmail.com', source: 'Referral', offer: 'Альфа Банк регистрация ИП + РКО', offerCategory: 'REGBIZ', manager: 'Козлов А.', status: 'NEW', amount: 1500, aiScore: 56, createdAt: '2026-05-01 12:10', comment: 'Хочет открыть ИП' },
];

export const offers: Offer[] = [
  { id: 'O-001', name: 'Альфа Банк РКО', category: 'RKO', rate: '0%', payout: 1500, geo: 'РФ', status: 'active' },
  { id: 'O-002', name: 'Т-Банк РКО', category: 'RKO', rate: '0%', payout: 1200, geo: 'РФ', status: 'active' },
  { id: 'O-003', name: 'Точка Банк РКО', category: 'RKO', rate: '0%', payout: 1400, geo: 'РФ', status: 'active' },
  { id: 'O-004', name: 'Газпромбанк РКО', category: 'RKO', rate: '0%', payout: 1300, geo: 'РФ', status: 'active' },
  { id: 'O-005', name: 'Уралсиб РКО', category: 'RKO', rate: '0%', payout: 1100, geo: 'РФ', status: 'active' },
  { id: 'O-006', name: 'Локо Банк РКО', category: 'RKO', rate: '0%', payout: 1000, geo: 'РФ', status: 'paused' },
  { id: 'O-007', name: 'УБРИР РКО', category: 'RKO', rate: '0%', payout: 1100, geo: 'РФ', status: 'active' },
  { id: 'O-008', name: 'Фора Банк РКО', category: 'RKO', rate: '0%', payout: 1050, geo: 'РФ', status: 'active' },
  { id: 'O-009', name: 'Альфа Банк регистрация ИП + РКО', category: 'REGBIZ', rate: '0%', payout: 1500, geo: 'РФ', status: 'active' },
  { id: 'O-010', name: 'Сбер кредитка', category: 'CREDIT', rate: '23.9%', payout: 1200, geo: 'РФ', status: 'active' },
  { id: 'O-011', name: 'Т-Банк кредитка', category: 'CREDIT', rate: '29.9%', payout: 900, geo: 'РФ', status: 'active' },
  { id: 'O-012', name: 'Альфа Банк кредитка', category: 'CREDIT', rate: '25.9%', payout: 1000, geo: 'РФ', status: 'active' },
  { id: 'O-013', name: 'Уралсиб кредитка', category: 'CREDIT', rate: '21.9%', payout: 700, geo: 'РФ', status: 'active' },
  { id: 'O-014', name: 'ВТБ дебетовая карта', category: 'DEBIT', rate: '-', payout: 500, geo: 'РФ', status: 'active' },
  { id: 'O-015', name: 'ВТБ платежный стикер', category: 'DEBIT', rate: '-', payout: 400, geo: 'РФ', status: 'active' },
  { id: 'O-016', name: 'Т-Банк дебетовая карта', category: 'DEBIT', rate: '-', payout: 600, geo: 'РФ', status: 'active' },
  { id: 'O-017', name: 'Альфа Банк дебетовая карта', category: 'DEBIT', rate: '-', payout: 550, geo: 'РФ', status: 'active' },
  { id: 'O-018', name: 'Газпромбанк дебетовая карта', category: 'DEBIT', rate: '-', payout: 500, geo: 'РФ', status: 'active' },
  { id: 'O-019', name: 'Фора Банк дебетовая', category: 'DEBIT', rate: '-', payout: 450, geo: 'РФ', status: 'active' },
  { id: 'O-020', name: 'Ак Барс дебетовая карта', category: 'DEBIT', rate: '-', payout: 550, geo: 'РФ', status: 'active' },
];

export const users: User[] = [
  { id: 'U-001', name: 'Петров Максим', role: 'TEAMLEAD', team: 'Alpha', leads: 145, revenue: 187500, conversion: 34, status: 'online', avatar: 'МП' },
  { id: 'U-002', name: 'Козлов Артём', role: 'USER', team: 'Alpha', leads: 98, revenue: 124000, conversion: 28, status: 'online', avatar: 'КА' },
  { id: 'U-003', name: 'Сидоров Кирилл', role: 'USER', team: 'Beta', leads: 112, revenue: 156800, conversion: 31, status: 'offline', avatar: 'СК' },
  { id: 'U-004', name: 'Николаева Дарья', role: 'TEAMLEAD', team: 'Beta', leads: 167, revenue: 215000, conversion: 37, status: 'online', avatar: 'НД' },
  { id: 'U-005', name: 'Орлов Игорь', role: 'USER', team: 'Alpha', leads: 76, revenue: 95200, conversion: 25, status: 'offline', avatar: 'ОИ' },
];

export const sources = [
  { name: 'Telegram', leads: 234, cpl: 120, conversion: 32, revenue: 312000, color: 'oklch(0.65 0.18 250)' },
  { name: 'Avito', leads: 189, cpl: 85, conversion: 28, revenue: 245700, color: 'oklch(0.72 0.19 155)' },
  { name: 'Yandex', leads: 156, cpl: 210, conversion: 22, revenue: 198000, color: 'oklch(0.78 0.15 85)' },
  { name: 'VK', leads: 134, cpl: 95, conversion: 26, revenue: 174200, color: 'oklch(0.6 0.15 250)' },
  { name: 'Direct', leads: 98, cpl: 0, conversion: 41, revenue: 156800, color: 'oklch(0.7 0.2 30)' },
  { name: 'Organic', leads: 67, cpl: 0, conversion: 38, revenue: 87100, color: 'oklch(0.65 0.18 310)' },
  { name: 'Referral', leads: 45, cpl: 50, conversion: 44, revenue: 67500, color: 'oklch(0.72 0.12 200)' },
];

export const revenueData = [
  { month: 'Янв', revenue: 420000, leads: 310 },
  { month: 'Фев', revenue: 485000, leads: 345 },
  { month: 'Мар', revenue: 530000, leads: 378 },
  { month: 'Апр', revenue: 610000, leads: 412 },
  { month: 'Май', revenue: 680000, leads: 456 },
];

export const dailyData = [
  { day: 'Пн', leads: 42, success: 14 },
  { day: 'Вт', leads: 38, success: 12 },
  { day: 'Ср', leads: 51, success: 18 },
  { day: 'Чт', leads: 46, success: 15 },
  { day: 'Пт', leads: 55, success: 21 },
  { day: 'Сб', leads: 28, success: 9 },
  { day: 'Вс', leads: 18, success: 5 },
];

export const statusColors: Record<string, string> = {
  NEW: 'bg-blue-500/20 text-blue-400',
  IN_PROGRESS: 'bg-amber-500/20 text-amber-400',
  SUCCESS: 'bg-emerald/20 text-emerald',
  REJECTED: 'bg-destructive/20 text-destructive',
};

export const categoryColors: Record<string, string> = {
  RKO: 'bg-emerald/20 text-emerald',
  CREDIT: 'bg-amber-500/20 text-amber-400',
  DEBIT: 'bg-blue-500/20 text-blue-400',
  REGBIZ: 'bg-purple-500/20 text-purple-400',
  MFO: 'bg-red-500/20 text-red-400',
  HR: 'bg-cyan-500/20 text-cyan-400',
};