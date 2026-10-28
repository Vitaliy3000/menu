/** Ход работ каждой роли: паузы без шага «Отдых» и стадии у плиты или в духовке, которые ведут двое. */
import type { CookPlan, PlanStep } from '../src/types/cook-plan.gen.ts';

export interface IdleGap {
  role: string;
  /** Индекс шага после паузы в plan.steps — для пути к ошибке. */
  index: number;
  from: number;
  to: number;
}

/** Промежутки, когда у роли нет ни активного шага, ни отдыха: непонятно, начинать следующий шаг сейчас или позже. */
export function idleGaps(steps: PlanStep[]): IdleGap[] {
  const gaps: IdleGap[] = [];
  const busyUntil = new Map<string, number>();
  steps.forEach((step, index) => {
    if (!step.role || (step.passive && !step.rest)) return;
    const from = busyUntil.get(step.role) ?? 0;
    if (step.at > from) gaps.push({ role: step.role, index, from, to: step.at });
    busyUntil.set(step.role, Math.max(from, step.at + step.duration));
  });
  return gaps;
}

export interface StageConflict {
  /** Ожидание с таймером, вокруг которого стадия. */
  wait: PlanStep;
  /** Шаг той же стадии у другой роли. */
  other: PlanStep;
  /** Индекс other в plan.steps — для пути к ошибке. */
  index: number;
}

/** Как далеко от ожидания ищем шаги «поставить» и «снять», минут. */
const STAGE_REACH = 15;

/**
 * Стадия — ожидание с таймером на плите или в духовке и шаги того же блюда с той же посудой или духовкой:
 * поставить, помешать во время ожидания, снять. Всю стадию ведёт тот, у кого таймер.
 */
export function stageConflicts(plan: CookPlan): StageConflict[] {
  const kinds = new Map(plan.equipment.map((e) => [e.id, e.kind]));
  const conflicts: StageConflict[] = [];
  for (const wait of plan.steps) {
    if (!wait.passive || wait.rest || !wait.timer || !wait.role) continue;
    if (!wait.equipment?.some((id) => kinds.get(id) === 'oven' || kinds.get(id) === 'hob')) continue;
    const vessels = wait.equipment.filter((id) => kinds.get(id) !== 'hob' && kinds.get(id) !== 'tool');
    const linked = plan.steps.flatMap((step, index) =>
      !step.passive && step.dishes?.some((d) => wait.dishes?.includes(d)) && step.equipment?.some((id) => vessels.includes(id))
        ? [{ step, index }]
        : [],
    );
    const end = wait.at + wait.duration;
    const putIn = linked.filter(({ step }) => step.at <= wait.at && wait.at - step.at - step.duration <= STAGE_REACH).at(-1);
    const during = linked.filter(({ step }) => step.at > wait.at && step.at < end);
    const takeOut = linked.find(({ step }) => step.at >= end && step.at - end <= STAGE_REACH);
    for (const s of [putIn, ...during, takeOut]) {
      if (s && s.step.role !== wait.role) conflicts.push({ wait, other: s.step, index: s.index });
    }
  }
  return conflicts;
}
