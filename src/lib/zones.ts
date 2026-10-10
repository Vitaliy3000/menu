/** Зоны кухни в шагах техкарты: подписи и поиск шагов, где двое оказались в одной зоне. */
import type { PlanStep, Zone } from '../types/cook-plan.gen.ts';

export const ZONE_LABELS: Record<Zone, string> = {
  prep: 'Подготовка',
  hot: 'Горячая зона',
  pack: 'Фасовка',
  dry: 'Сухое хранение',
  cold: 'Холодное хранение',
};

/** Зоны, где одновременно работает только один человек; в хранении ограничений нет. */
export const EXCLUSIVE_ZONES: readonly Zone[] = ['prep', 'hot', 'pack'];

export interface ZoneConflict {
  /** id шагов: first начинается не позже second. */
  first: string;
  second: string;
  /** Индекс second в plan.steps — для пути к ошибке. */
  index: number;
  zone: Zone;
  from: number;
  to: number;
}

/**
 * Пары активных шагов разных ролей, которые пересекаются по времени в одной зоне на одного человека.
 * Пассивные шаги не занимают зону: пока блюдо томится или запекается, руки свободны.
 */
export function zoneConflicts(steps: PlanStep[]): ZoneConflict[] {
  const active = steps.flatMap((step, index) => (step.passive || !step.role || !step.zones ? [] : [{ step, index }]));
  const conflicts: ZoneConflict[] = [];
  active.forEach((a, i) => {
    for (const b of active.slice(i + 1)) {
      if (a.step.role === b.step.role) continue;
      const from = Math.max(a.step.at, b.step.at);
      const to = Math.min(a.step.at + a.step.duration, b.step.at + b.step.duration);
      if (from >= to) continue;
      const zone = EXCLUSIVE_ZONES.find((z) => a.step.zones?.includes(z) && b.step.zones?.includes(z));
      if (zone) conflicts.push({ first: a.step.id, second: b.step.id, index: b.index, zone, from, to });
    }
  });
  return conflicts;
}
