/** Производные значения техкарты для отображения. Никакого планирования — только арифметика над готовыми данными. */
import type { CookPlan, PlanStep, Role } from '../types/cook-plan.gen.ts';
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

/** Ключ инвентаря в progress.got — с префиксом, чтобы не совпасть с id продукта. */
export const buyKey = (equipmentId: string) => `eq:${equipmentId}`;

/** Всё, что надо купить: продукты и инвентарь с buy. Ключи — как в progress.got. */
export const shoppingKeys = (plan: CookPlan) => [
  ...plan.ingredients.map((i) => i.id),
  ...plan.equipment.filter((e) => e.buy).map((e) => buyKey(e.id)),
];

export const gotCount = (plan: CookPlan, progress: PlanProgress) =>
  shoppingKeys(plan).filter((key) => progress.got.includes(key)).length;

/** Роль, выбранная на этом устройстве, — только если она есть в техкарте. */
export const activeRole = (plan: CookPlan, progress: PlanProgress): Role | undefined =>
  plan.roles?.find((r) => r.id === progress.role);

/** Шаги роли; без ролей или без выбранной роли — все шаги. */
export const roleSteps = (plan: CookPlan, role?: Role): PlanStep[] => (role ? plan.steps.filter((s) => s.role === role.id) : plan.steps);

/** Шаги, которые ведёт это устройство: своей роли или все. */
export const mySteps = (plan: CookPlan, progress: PlanProgress) => roleSteps(plan, activeRole(plan, progress));

export const doneStepCount = (plan: CookPlan, progress: PlanProgress) =>
  mySteps(plan, progress).filter((s) => progress.done.includes(s.id)).length;

/** Готовка начата, но не закончена. */
export function isInProgress(plan: CookPlan, progress: PlanProgress): boolean {
  const done = doneStepCount(plan, progress);
  return (progress.startedAt !== null || done > 0) && done < mySteps(plan, progress).length;
}
