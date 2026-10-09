/** Форматирование чисел, количеств, времени и дат по-русски. */
import type { Unit } from '../types/recipe.gen.ts';

export type PluralForms = readonly [one: string, few: string, many: string];

/** 1 порция, 2 порции, 5 порций; дробные — «1,5 порции». */
export function plural(n: number, forms: PluralForms): string {
  if (!Number.isInteger(n)) return forms[1];
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

export const countLabel = (n: number, forms: PluralForms) => `${formatNumber(n)}\u00a0${plural(n, forms)}`;

const numberFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
export const formatNumber = (n: number) => numberFormat.format(n).replace(/ /g, ' ');

/**
 * Неразрывные пробелы там, где перенос строки выглядит неряшливо:
 * «200 °C», «35 мин», «1,5 кг», «суп — это». Применяется к текстам данных при загрузке.
 */
export function typograph(text: string): string {
  return text
    .replace(/(\d) (?=[а-яё°%×])/giu, '$1\u00a0')
    .replace(/ (—|–) /g, '\u00a0$1 ')
    .replace(/(^|\s)(в|и|с|к|о|у|на|не|по|до|за|из|от|без) /giu, '$1$2\u00a0');
}

/* ------------------------------------------------------------------ */
/* Единицы измерения                                                   */
/* ------------------------------------------------------------------ */

const UNIT_LABELS: Record<Unit, string | PluralForms> = {
  g: 'г',
  kg: 'кг',
  ml: 'мл',
  l: 'л',
  pcs: 'шт.',
  tsp: 'ч. л.',
  tbsp: 'ст. л.',
  cup: ['стакан', 'стакана', 'стаканов'],
  pinch: ['щепотка', 'щепотки', 'щепоток'],
  clove: ['зубчик', 'зубчика', 'зубчиков'],
  bunch: ['пучок', 'пучка', 'пучков'],
  can: ['банка', 'банки', 'банок'],
  slice: ['ломтик', 'ломтика', 'ломтиков'],
  sprig: ['веточка', 'веточки', 'веточек'],
  leaf: ['лист', 'листа', 'листов'],
  pack: ['упаковка', 'упаковки', 'упаковок'],
  handful: ['горсть', 'горсти', 'горстей'],
};

export function unitLabel(unit: Unit, amount: number): string {
  const label = UNIT_LABELS[unit];
  return typeof label === 'string' ? label : plural(amount, label);
}

/** Единицы, которые удобнее показывать простыми дробями: ½ ст. л., 1½ стакана. */
const FRACTION_UNITS = new Set<Unit>(['pcs', 'tsp', 'tbsp', 'cup', 'pinch', 'clove', 'bunch', 'can', 'slice', 'sprig', 'leaf', 'pack', 'handful']);

const FRACTIONS: [number, string][] = [
  [0.25, '¼'],
  [1 / 3, '⅓'],
  [0.5, '½'],
  [2 / 3, '⅔'],
  [0.75, '¾'],
];

/** Мерные ложки и стаканы: допустимы ¼ и ⅓. Штучное (луковицы, зубчики, банки) — только половинки. */
const SPOON_UNITS = new Set<Unit>(['tsp', 'tbsp', 'cup']);

/** Округляет количество до «кухонной» точности. Нужен после масштабирования порций. */
export function roundAmount(amount: number, unit?: Unit): number {
  if (unit && SPOON_UNITS.has(unit)) {
    const quarters = Math.round(amount * 4) / 4;
    const thirds = Math.round(amount * 3) / 3;
    const best = Math.abs(thirds - amount) < Math.abs(quarters - amount) - 1e-9 ? thirds : quarters;
    return Math.max(best, 0.25);
  }
  if (!unit || FRACTION_UNITS.has(unit)) return Math.max(Math.round(amount * 2) / 2, 0.5);
  if (unit === 'kg' || unit === 'l') return Math.round(amount * 100) / 100;
  if (amount < 10) return Math.round(amount * 2) / 2;
  if (amount < 100) return Math.round(amount);
  if (amount < 1000) return Math.round(amount / 5) * 5;
  return Math.round(amount / 10) * 10;
}

function formatFractional(n: number): string {
  const whole = Math.floor(n + 1e-9);
  const rest = n - whole;
  if (rest < 1e-6) return String(whole);
  const frac = FRACTIONS.find(([v]) => Math.abs(v - rest) < 0.02);
  if (!frac) return formatNumber(Math.round(n * 100) / 100);
  return whole === 0 ? frac[1] : `${whole}${frac[1]}`;
}

export function formatQuantityNumber(n: number, unit?: Unit): string {
  return !unit || FRACTION_UNITS.has(unit) ? formatFractional(n) : formatNumber(n);
}

/** «1,5 кг», «2–3 зубчика», «½ ч. л.», «3 шт.» */
export function formatAmount(amount: number, unit?: Unit, amountMax?: number): string {
  const a = formatQuantityNumber(amount, unit);
  const range = amountMax !== undefined ? `${a}–${formatQuantityNumber(amountMax, unit)}` : a;
  if (!unit) return range;
  return `${range} ${unitLabel(unit, amountMax ?? amount)}`;
}

/* ------------------------------------------------------------------ */
/* Время                                                               */
/* ------------------------------------------------------------------ */

/** 40 мин · 1 ч · 1 ч 05 мин */
export function formatDuration(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} ч` : `${h} ч ${String(rest).padStart(2, '0')} мин`;
}

/** Компактно для бейджей: 40′, 1:05 */
export function formatDurationShort(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m} мин`;
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

/** Смещение от начала дня готовки: +0:35, +2:10 */
export function formatOffset(minutes: number): string {
  return `+${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Обратный отсчёт таймера: 4:05, 1:02:30 */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

export function formatClock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ */
/* Даты                                                                */
/* ------------------------------------------------------------------ */

/** Локальная полночь для строки YYYY-MM-DD (без сдвига часового пояса). */
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

/** Дата + время HH:MM в локальном часовом поясе. */
export function parseDateTime(isoDate: string, clock: string): Date {
  const date = parseDate(isoDate);
  const [h, m] = clock.split(':').map(Number);
  date.setHours(h!, m!, 0, 0);
  return date;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const dayMonth = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
const weekdayLong = new Intl.DateTimeFormat('ru-RU', { weekday: 'long' });
const weekdayShort = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' });
const monthShort = new Intl.DateTimeFormat('ru-RU', { month: 'short' });
const fullDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

export const formatDayMonth = (d: Date) => dayMonth.format(d);
export const formatFullDate = (d: Date) => fullDate.format(d);
export const formatWeekday = (d: Date) => weekdayLong.format(d);
export const formatWeekdayShort = (d: Date) => weekdayShort.format(d).replace('.', '');
export const formatMonthShort = (d: Date) => monthShort.format(d).replace('.', '');

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** «Воскресенье, 11 октября» */
export function formatLongDate(d: Date): string {
  return `${capitalize(formatWeekday(d))}, ${formatDayMonth(d)}`;
}

export function daysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** «сегодня», «завтра», «через 3 дня», «вчера», «5 дней назад» */
export function formatRelativeDay(date: Date, today: Date = new Date()): string {
  const diff = daysBetween(today, date);
  if (diff === 0) return 'сегодня';
  if (diff === 1) return 'завтра';
  if (diff === -1) return 'вчера';
  const forms = ['день', 'дня', 'дней'] as const;
  return diff > 0 ? `через ${countLabel(diff, forms)}` : `${countLabel(-diff, forms)} назад`;
}

export const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'] as const;
export const MONTHS_IN = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'] as const;
