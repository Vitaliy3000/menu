/** Производные значения техкарты для отображения. Никакого планирования — только арифметика над готовыми данными. */
import type { CookPlan, PlanStep } from '../types/cook-plan.gen.ts';
import { DISH_TONES } from './labels.ts';
import type { PlanProgress } from './progress.ts';

export const totalPortions = (plan: CookPlan) => plan.dishes.reduce((sum, d) => sum + d.portions, 0);

/**
 * Опорный момент для часов на шагах: фактический старт, а до него — рекомендуемое
 * время начала сегодня. Без start и без старта часов нет, только смещения +0:35.
 */
export function planBase(plan: CookPlan, startedAt: number | null): Date | null {
  if (startedAt) return new Date(startedAt);
  if (!plan.start) return null;
  const [h, m] = plan.start.split(':').map(Number);
  const today = new Date();
  today.setHours(h!, m!, 0, 0);
  return today;
}

export const stepTime = (base: Date, minutes: number) => new Date(base.getTime() + minutes * 60_000);

export function dishTones(plan: CookPlan): Map<string, string> {
  return new Map(plan.dishes.map((d, i) => [d.id, DISH_TONES[i % DISH_TONES.length]!]));
}

/** Первый невыполненный шаг — «текущий». */
export function currentStepIndex(steps: PlanStep[], done: string[]): number {
  const i = steps.findIndex((s) => !done.includes(s.id));
  return i === -1 ? steps.length : i;
}

export const doneStepCount = (plan: CookPlan, progress: PlanProgress) =>
  plan.steps.filter((s) => progress.done.includes(s.id)).length;

/** Готовка начата, но не закончена. */
export function isInProgress(plan: CookPlan, progress: PlanProgress): boolean {
  const done = doneStepCount(plan, progress);
  return (progress.startedAt !== null || done > 0) && done < plan.steps.length;
}
