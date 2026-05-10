/**
 * AI LEAD SCORING ENGINE — Rko System
 *
 * Полностью расчётная система. Никакого random().
 * Все данные берутся из реальных полей лида и исторической статистики.
 *
 * ФОРМУЛА:
 * AI_SCORE = completeness * 0.20
 *          + dataValidity * 0.15
 *          + sourceQuality * 0.20
 *          + managerActivity * 0.15
 *          + commentIntent * 0.10
 *          + statusProgression * 0.10
 *          + amountRelevance * 0.10
 */

// ─── TYPES ────────────────────────────────────────────

export type LeadTemperature = 'HOT' | 'WARM' | 'COLD' | 'DEAD';

export interface AIAnalysisResult {
  /** Итоговый AI score 0–100 */
  ai_score: number;
  /** Вероятность закрытия 0–100 */
  ai_probability: number;
  /** Температура лида */
  lead_temperature: LeadTemperature;
  /** AI рекомендации (массив строк) */
  ai_recommendations: string[];
  /** AI флаги проблем (массив строк) */
  ai_flags: string[];
  /** Разбивка по факторам для прозрачности */
  factors: {
    completeness: number;
    dataValidity: number;
    sourceQuality: number;
    managerActivity: number;
    commentIntent: number;
    statusProgression: number;
    amountRelevance: number;
  };
}

export interface LeadForAnalysis {
  id?: string;
  name: string;
  phone?: string | null;
  telegram?: string | null;
  email?: string | null;
  comment?: string | null;
  source?: string | null;
  offer?: string | null;
  offer_category?: string | null;
  amount?: number | null;
  status?: string;
  created_at?: string;
  created_by?: string | null;
  image_url?: string | null;
}

export interface HistoricalStats {
  /** Конверсия по источникам: source -> { total, success } */
  sourceConversion: Record<string, { total: number; success: number }>;
  /** Все лиды для проверки дубликатов */
  allLeads: { phone?: string | null; telegram?: string | null; email?: string | null; id?: string }[];
  /** Среднее время от NEW до IN_PROGRESS (часы) */
  avgResponseTimeHours?: number;
  /** Средняя сумма успешных сделок */
  avgDealAmount?: number;
}

// ─── 1. COMPLETENESS — 20% ────────────────────────────

function scoreCompleteness(lead: LeadForAnalysis): { score: number; missing: string[] } {
  const fields: { key: keyof LeadForAnalysis; label: string; weight: number }[] = [
    { key: 'name', label: 'Имя', weight: 15 },
    { key: 'phone', label: 'Телефон', weight: 20 },
    { key: 'telegram', label: 'Telegram', weight: 10 },
    { key: 'email', label: 'Email', weight: 10 },
    { key: 'comment', label: 'Комментарий', weight: 15 },
    { key: 'source', label: 'Источник', weight: 10 },
    { key: 'offer', label: 'Оффер/Продукт', weight: 10 },
    { key: 'amount', label: 'Сумма', weight: 5 },
    { key: 'image_url', label: 'Скриншот', weight: 5 },
  ];

  let total = 0;
  const missing: string[] = [];

  for (const f of fields) {
    const val = lead[f.key];
    const filled = val !== null && val !== undefined && val !== '' && val !== 0;
    if (filled) {
      total += f.weight;
    } else {
      missing.push(f.label);
    }
  }

  return { score: total, missing };
}

// ─── 2. DATA VALIDITY — 15% ──────────────────────────

function scoreDataValidity(lead: LeadForAnalysis, allLeads: HistoricalStats['allLeads']): { score: number; flags: string[] } {
  let score = 50; // Baseline
  const flags: string[] = [];

  // Phone validation
  if (lead.phone) {
    const cleanPhone = lead.phone.replace(/\D/g, '');
    if (cleanPhone.length >= 10 && cleanPhone.length <= 12) {
      score += 15; // Valid phone length
    } else {
      score -= 20;
      flags.push('Невалидный номер телефона');
    }
    // Check for obvious fakes like 1111111111
    if (/^(.)\1{6,}$/.test(cleanPhone)) {
      score -= 20;
      flags.push('Фейковый номер телефона');
    }
  } else {
    score -= 5;
  }

  // Email validation
  if (lead.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(lead.email)) {
      score += 10;
    } else {
      score -= 10;
      flags.push('Невалидный email');
    }
  }

  // Telegram validation
  if (lead.telegram) {
    const tg = lead.telegram.trim();
    if (tg.startsWith('@') && tg.length > 3) {
      score += 10;
    } else if (tg.length > 2) {
      score += 5; // Some value but not standard format
    }
  }

  // Name validation — too short / suspicious
  if (lead.name) {
    if (lead.name.trim().length < 3) {
      score -= 10;
      flags.push('Имя слишком короткое');
    } else if (lead.name.trim().length >= 5) {
      score += 5;
    }
    // Check for test names
    const testNames = ['тест', 'test', 'asdf', 'qwerty', 'aaa', 'ааа', 'qqq'];
    if (testNames.some(t => lead.name.toLowerCase().includes(t))) {
      score -= 15;
      flags.push('Подозрительное имя (тест?)');
    }
  }

  // Duplicate check
  if (lead.phone || lead.email || lead.telegram) {
    const isDuplicate = allLeads.some(other => {
      if (other.id && lead.id && other.id === lead.id) return false;
      if (lead.phone && other.phone && lead.phone.replace(/\D/g, '') === other.phone.replace(/\D/g, '')) return true;
      if (lead.email && other.email && lead.email.toLowerCase() === other.email.toLowerCase()) return true;
      if (lead.telegram && other.telegram && lead.telegram.toLowerCase() === other.telegram.toLowerCase()) return true;
      return false;
    });
    if (isDuplicate) {
      score -= 30;
      flags.push('Дубликат — контакт уже есть в системе');
    }
  }

  return { score: Math.max(0, Math.min(100, score)), flags };
}

// ─── 3. SOURCE QUALITY — 20% ─────────────────────────

function scoreSourceQuality(lead: LeadForAnalysis, stats: HistoricalStats): { score: number; insight: string | null } {
  const source = lead.source || '';
  if (!source) return { score: 30, insight: 'Не указан источник — невозможно оценить качество трафика' };

  const srcData = stats.sourceConversion[source];
  if (!srcData || srcData.total === 0) {
    return { score: 50, insight: `Нет исторических данных для "${source}"` };
  }

  const convRate = (srcData.success / srcData.total) * 100;

  // Scale: 0% conv → 10 score, 50%+ conv → 90 score
  let score: number;
  if (convRate >= 60) score = 95;
  else if (convRate >= 50) score = 85;
  else if (convRate >= 40) score = 75;
  else if (convRate >= 30) score = 60;
  else if (convRate >= 20) score = 45;
  else if (convRate >= 10) score = 30;
  else score = 15;

  const insight = `${source}: конверсия ${convRate.toFixed(0)}% (${srcData.success}/${srcData.total})`;
  return { score, insight };
}

// ─── 4. MANAGER ACTIVITY — 15% ───────────────────────

function scoreManagerActivity(lead: LeadForAnalysis): { score: number; recommendations: string[] } {
  const recommendations: string[] = [];
  let score = 50;

  if (!lead.created_at) return { score: 50, recommendations };

  const ageMs = Date.now() - new Date(lead.created_at).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  const ageDays = ageHours / 24;

  // Status-based activity scoring
  switch (lead.status) {
    case 'NEW':
      if (ageHours < 1) {
        score = 90;
      } else if (ageHours < 4) {
        score = 75;
      } else if (ageHours < 12) {
        score = 55;
        recommendations.push('Лид ожидает обработки более 4 часов');
      } else if (ageHours < 24) {
        score = 35;
        recommendations.push('Лид не обработан более 12 часов — скорость ответа критична!');
      } else {
        score = 10;
        recommendations.push(`Лид без ответа уже ${Math.floor(ageDays)} дн. — высокий риск потери!`);
      }
      break;

    case 'IN_PROGRESS':
      if (ageDays < 3) {
        score = 80;
      } else if (ageDays < 7) {
        score = 60;
        recommendations.push('Лид в работе более 3 дней — обновите статус');
      } else if (ageDays < 14) {
        score = 40;
        recommendations.push('Лид завис в работе более 7 дней');
      } else {
        score = 15;
        recommendations.push(`Лид в работе ${Math.floor(ageDays)} дн. — скорее всего "зависший"`);
      }
      break;

    case 'SUCCESS':
      score = 95;
      break;

    case 'REJECTED':
      score = 10;
      break;

    default:
      score = 40;
  }

  // Comment presence as activity indicator
  if (lead.comment && lead.comment.length > 20) {
    score = Math.min(100, score + 10);
  } else if (!lead.comment && lead.status === 'IN_PROGRESS') {
    recommendations.push('Нет комментариев — добавьте описание текущего этапа');
  }

  return { score: Math.max(0, Math.min(100, score)), recommendations };
}

// ─── 5. COMMENT INTENT ANALYSIS — 10% ────────────────

const POSITIVE_KEYWORDS = [
  'заинтересован', 'готов', 'хочет', 'согласен', 'подтвердил', 'оплатил', 'оплата',
  'одобрен', 'подписал', 'договор', 'сделка', 'купил', 'перевел', 'перевёл',
  'да', 'отлично', 'хорошо', 'супер', 'класс', 'ожидает оплату', 'переводит',
  'согласовал', 'утвердил', 'принял', 'берёт', 'берет', 'оформля', 'заключ',
];

const NEGATIVE_KEYWORDS = [
  'не интересно', 'отказ', 'не хочет', 'не нужно', 'дорого', 'нет денег',
  'подумает', 'позже', 'не берёт', 'не берет', 'не отвечает', 'не выходит на связь',
  'заблокировал', 'скинул', 'спам', 'фейк', 'бот', 'мошенник', 'развод',
  'невозможно', 'отключен', 'недоступен', 'молчит', 'игнорирует', 'жалоба',
];

const MEDIUM_KEYWORDS = [
  'подумаю', 'может быть', 'перезвоню', 'посмотрю', 'надо обсудить',
  'пока не готов', 'в процессе', 'думает', 'рассматривает', 'сравнивает',
  'уточняет', 'советуется', 'ждёт', 'ждет',
];

function scoreCommentIntent(comment: string | null | undefined): { score: number; intent: string } {
  if (!comment || comment.trim().length === 0) {
    return { score: 40, intent: 'Нет комментария' };
  }

  const lower = comment.toLowerCase();
  const len = comment.trim().length;

  let positiveHits = 0;
  let negativeHits = 0;
  let mediumHits = 0;

  for (const kw of POSITIVE_KEYWORDS) {
    if (lower.includes(kw)) positiveHits++;
  }
  for (const kw of NEGATIVE_KEYWORDS) {
    if (lower.includes(kw)) negativeHits++;
  }
  for (const kw of MEDIUM_KEYWORDS) {
    if (lower.includes(kw)) mediumHits++;
  }

  // Determine dominant intent
  if (negativeHits > positiveHits && negativeHits > mediumHits) {
    return { score: Math.max(5, 25 - negativeHits * 5), intent: 'Негативный интент' };
  }
  if (positiveHits > negativeHits && positiveHits > mediumHits) {
    return { score: Math.min(95, 70 + positiveHits * 5), intent: 'Позитивный интент' };
  }
  if (mediumHits > 0) {
    return { score: 50, intent: 'Средний интент — клиент думает' };
  }

  // Neutral — score by length (more detail is better)
  if (len > 100) return { score: 60, intent: 'Нейтральный, подробный' };
  if (len > 30) return { score: 50, intent: 'Нейтральный' };
  return { score: 40, intent: 'Короткий комментарий' };
}

// ─── 6. STATUS PROGRESSION — 10% ─────────────────────

function scoreStatusProgression(status: string | undefined): number {
  switch (status) {
    case 'SUCCESS': return 100;
    case 'IN_PROGRESS': return 65;
    case 'NEW': return 45;
    case 'REJECTED': return 5;
    default: return 30;
  }
}

// ─── 7. AMOUNT RELEVANCE — 10% ───────────────────────

function scoreAmountRelevance(amount: number | null | undefined, avgDeal: number): number {
  if (!amount || amount <= 0) return 20;
  if (avgDeal <= 0) return 50; // No historical data

  const ratio = amount / avgDeal;
  if (ratio >= 2) return 90; // High-value deal
  if (ratio >= 1) return 75;
  if (ratio >= 0.5) return 55;
  if (ratio >= 0.2) return 40;
  return 25;
}

// ─── TEMPERATURE CLASSIFICATION ───────────────────────

function classifyTemperature(score: number, status?: string): LeadTemperature {
  if (status === 'REJECTED') return 'DEAD';
  if (score >= 70) return 'HOT';
  if (score >= 40) return 'WARM';
  if (score >= 20) return 'COLD';
  return 'DEAD';
}

// ─── CLOSE PROBABILITY ───────────────────────────────

function calculateCloseProbability(score: number, status?: string): number {
  if (status === 'SUCCESS') return 100;
  if (status === 'REJECTED') return 0;

  // Non-linear mapping: score → probability
  // AI score reflects quality; probability reflects likelihood of closing
  let base: number;
  if (score >= 85) base = 82;
  else if (score >= 70) base = 65;
  else if (score >= 55) base = 45;
  else if (score >= 40) base = 28;
  else if (score >= 25) base = 14;
  else base = 5;

  // Status modifier
  if (status === 'IN_PROGRESS') base = Math.min(95, base + 10);

  return Math.max(0, Math.min(100, Math.round(base)));
}

// ─── GENERATE RECOMMENDATIONS ─────────────────────────

function generateRecommendations(
  lead: LeadForAnalysis,
  factors: AIAnalysisResult['factors'],
  flags: string[],
  missingFields: string[],
  sourceInsight: string | null,
  activityRecs: string[],
  commentIntent: string,
): string[] {
  const recs: string[] = [];

  // From activity analysis
  recs.push(...activityRecs);

  // Missing fields
  if (missingFields.length > 0 && missingFields.length <= 3) {
    recs.push(`Заполните: ${missingFields.join(', ')}`);
  } else if (missingFields.length > 3) {
    recs.push(`Не заполнено ${missingFields.length} полей — добавьте больше данных`);
  }

  // Source insights
  if (sourceInsight && factors.sourceQuality < 40) {
    recs.push(sourceInsight);
  }

  // Comment-based
  if (commentIntent === 'Негативный интент') {
    recs.push('Клиент настроен негативно — смените подход или предложите альтернативу');
  }
  if (commentIntent === 'Средний интент — клиент думает') {
    recs.push('Клиент размышляет — подготовьте аргументы и позвоните');
  }

  // Amount-based
  if (!lead.amount || lead.amount <= 0) {
    recs.push('Уточните бюджет и сумму сделки');
  }

  // High probability special
  if (factors.sourceQuality >= 70 && factors.commentIntent >= 60 && factors.completeness >= 60) {
    recs.push('🔥 Высокая вероятность закрытия — приоритизируйте этот лид!');
  }

  // Risk of loss
  if (factors.managerActivity < 30 && lead.status !== 'SUCCESS' && lead.status !== 'REJECTED') {
    recs.push('⚠️ Высокий риск потери — обработайте лид как можно скорее');
  }

  return recs.slice(0, 5); // Max 5 recommendations
}

// ─── MAIN ANALYSIS FUNCTION ──────────────────────────

/**
 * Analyze a lead and return a full AI scoring result.
 * All values are deterministically calculated — NO randomness.
 */
export function analyzeLeadAI(
  lead: LeadForAnalysis,
  stats: HistoricalStats = { sourceConversion: {}, allLeads: [], avgDealAmount: 0 },
): AIAnalysisResult {
  // 1. Completeness (20%)
  const { score: completeness, missing } = scoreCompleteness(lead);

  // 2. Data validity (15%)
  const { score: dataValidity, flags } = scoreDataValidity(lead, stats.allLeads);

  // 3. Source quality (20%)
  const { score: sourceQuality, insight: sourceInsight } = scoreSourceQuality(lead, stats);

  // 4. Manager activity (15%)
  const { score: managerActivity, recommendations: activityRecs } = scoreManagerActivity(lead);

  // 5. Comment intent (10%)
  const { score: commentIntent, intent } = scoreCommentIntent(lead.comment);

  // 6. Status progression (10%)
  const statusProgression = scoreStatusProgression(lead.status);

  // 7. Amount relevance (10%)
  const amountRelevance = scoreAmountRelevance(lead.amount, stats.avgDealAmount || 0);

  // Weighted score
  const rawScore =
    completeness * 0.20 +
    dataValidity * 0.15 +
    sourceQuality * 0.20 +
    managerActivity * 0.15 +
    commentIntent * 0.10 +
    statusProgression * 0.10 +
    amountRelevance * 0.10;

  const ai_score = Math.max(0, Math.min(100, Math.round(rawScore)));
  const lead_temperature = classifyTemperature(ai_score, lead.status);
  const ai_probability = calculateCloseProbability(ai_score, lead.status);

  const factors = { completeness, dataValidity, sourceQuality, managerActivity, commentIntent, statusProgression, amountRelevance };

  const ai_recommendations = generateRecommendations(lead, factors, flags, missing, sourceInsight, activityRecs, intent);

  return {
    ai_score,
    ai_probability,
    lead_temperature,
    ai_recommendations,
    ai_flags: flags,
    factors,
  };
}

// ─── HELPERS FOR UI ───────────────────────────────────

export const TEMPERATURE_CONFIG: Record<LeadTemperature, { label: string; color: string; bg: string; emoji: string }> = {
  HOT:  { label: 'Горячий', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', emoji: '🔥' },
  WARM: { label: 'Тёплый',  color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', emoji: '🌤' },
  COLD: { label: 'Холодный', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', emoji: '❄️' },
  DEAD: { label: 'Мёртвый', color: '#6b7280', bg: 'rgba(107,114,128,0.15)', emoji: '💀' },
};

export function getScoreColor(score: number): string {
  if (score >= 70) return '#10b981';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

/**
 * Build historical stats from an array of all leads.
 * Call this once when fetching leads, then pass to analyzeLeadAI for each lead.
 */
export function buildHistoricalStats(allLeads: LeadForAnalysis[]): HistoricalStats {
  const sourceConversion: Record<string, { total: number; success: number }> = {};
  let totalSuccessAmount = 0;
  let successCount = 0;

  for (const l of allLeads) {
    const src = l.source || 'Другое';
    if (!sourceConversion[src]) sourceConversion[src] = { total: 0, success: 0 };
    sourceConversion[src].total++;
    if (l.status === 'SUCCESS') {
      sourceConversion[src].success++;
      totalSuccessAmount += (l.amount || 0);
      successCount++;
    }
  }

  return {
    sourceConversion,
    allLeads,
    avgDealAmount: successCount > 0 ? totalSuccessAmount / successCount : 0,
  };
}
