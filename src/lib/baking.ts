/** Выпечка: пекарские проценты, части теста (предфермент, юдане), загрузка формы. */
import type { BakeIngredient, Formula, Pan } from '../types/bake.gen.ts';
import { formatNumber } from './format.ts';

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Сумма муки — это 100 % в пекарских процентах. */
export const flourGrams = (f: Formula) => sum(f.ingredients.filter((i) => i.flour).map((i) => i.grams));

/** Вес всего теста. */
export const doughGrams = (f: Formula) => sum(f.ingredients.map((i) => i.grams));

/** Пекарский процент: доля от веса муки. */
export const bakerPercent = (grams: number, flour: number) => (flour > 0 ? (grams / flour) * 100 : 0);

/** Сколько граммов ингредиента уходит в часть теста. */
export const inPart = (i: BakeIngredient, partId: string) => i.parts?.[partId] ?? 0;

/** Остаток ингредиента для финального теста. */
export const inFinal = (i: BakeIngredient) => i.grams - sum(Object.values(i.parts ?? {}));

/** Вес части теста. */
export const partGrams = (f: Formula, partId: string) => sum(f.ingredients.map((i) => inPart(i, partId)));

/** Сколько теста ждём по загрузке формы: г/л × объём × число форм. null — загрузка не задана. */
export function expectedDough(pan: Pan): number | null {
  if (pan.load === undefined || pan.volume === undefined) return null;
  return pan.load * pan.volume * (pan.count ?? 1);
}

/** Фактическая загрузка одной формы, г/л. null — объём формы не задан. */
export function actualLoad(f: Formula, pan: Pan): number | null {
  return pan.volume ? doughGrams(f) / (pan.count ?? 1) / pan.volume : null;
}

/** Граммы для таблицы: до 0,1 г меньше 100 г, дальше до грамма. */
export function roundGrams(g: number): number {
  return g < 100 ? Math.round(g * 10) / 10 : Math.round(g);
}

/** «форма 2,36 л с крышкой», «Форма Agnelli 30 × 23 см × 2». */
export function panSummary(pan: Pan): string {
  if (pan.volume !== undefined) {
    const lid = pan.lid === undefined ? '' : pan.lid ? ' с крышкой' : ' без крышки';
    return `форма ${formatNumber(pan.volume)}\u00a0л${lid}${pan.count && pan.count > 1 ? ` × ${pan.count}` : ''}`;
  }
  return `${pan.name}${pan.size ? ` ${pan.size}` : ''}${pan.count && pan.count > 1 ? ` × ${pan.count}` : ''}`;
}
