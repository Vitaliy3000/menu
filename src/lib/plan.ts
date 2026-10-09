/** Производные значения техкарты для отображения. Никакого планирования — только арифметика над готовыми данными. */
import type { CookPlan, PlanStep } from '../types/cook-plan.gen.ts';
import { daysBetween, parseDate, parseDateTime } from './format.ts';
import { DISH_TONES } from './labels.ts';

export type PlanWhen = 'past' | 'today' | 'upcoming';

export function planWhen(plan: CookPlan, today = new Date()): PlanWhen {
  const diff = daysBetween(today, parseDate(plan.date));
  return diff < 0 ? 'past' : diff === 0 ? 'today' : 'upcoming';
}

export const totalPortions = (plan: CookPlan) => plan.dishes.reduce((sum, d) => sum + d.portions, 0);

/** Опорный момент для часов на шагах: фактический старт, иначе плановый. */
export function planBase(plan: CookPlan, startedAt: number | null): Date | null {
  if (startedAt) return new Date(startedAt);
  return plan.start ? parseDateTime(plan.date, plan.start) : null;
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

export function nextUpcomingPlan(plans: CookPlan[], today = new Date()): CookPlan | undefined {
  return plans.find((p) => planWhen(p, today) !== 'past');
}
