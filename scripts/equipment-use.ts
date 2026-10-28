/** Посуда и инструменты, которые в один момент нужны в большем числе мест, чем их есть. */
import type { CookPlan, Equipment, PlanStep } from '../src/types/cook-plan.gen.ts';

export interface EquipmentOveruse {
  item: Equipment;
  /** Индекс шага, с которого вещи не хватает, в plan.steps — для пути к ошибке. */
  index: number;
  /** Шаги, которым вещь нужна в этот момент. */
  busy: PlanStep[];
}

/** Ожидание держит свою посуду, а активный шаг того же блюда работает в ней же: в кастрюлю, где томится говядина, добавляют грибы. */
function places(busy: PlanStep[]): number {
  const waiting = busy.filter((step) => step.passive);
  const waitingDishes = new Set(waiting.flatMap((step) => step.dishes ?? []));
  return waiting.length + busy.filter((step) => !step.passive && !step.dishes?.some((d) => waitingDishes.has(d))).length;
}

export function equipmentOveruse(plan: CookPlan): EquipmentOveruse[] {
  const overuse: EquipmentOveruse[] = [];
  for (const item of plan.equipment) {
    if (item.kind !== 'cookware' && item.kind !== 'tool') continue;
    const using = plan.steps.flatMap((step, index) => (step.equipment?.includes(item.id) ? [{ step, index }] : []));
    for (const { step, index } of using) {
      const busy = using
        .filter((u) => u.index === index || (u.index < index && step.at < u.step.at + u.step.duration))
        .map((u) => u.step);
      if (places(busy) > (item.count ?? 1)) overuse.push({ item, index, busy });
    }
  }
  return overuse;
}
