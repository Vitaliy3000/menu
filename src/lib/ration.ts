/** Рацион техкарты: что человек ест в конкретный день и сколько это в сумме. Только арифметика над готовыми данными. */
import type { CookPlan, Ration, RationDay } from '../types/cook-plan.gen.ts';

export type MealKind = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealLine {
  meal: MealKind;
  /** Название блюда или перекуса. */
  name: string;
  /** Размер порции или состав. */
  detail: string;
  kcal: number;
  protein: number;
}

export interface PersonDay {
  lines: MealLine[];
  kcal: number;
  protein: number;
}

/** Строки дня одного человека в порядке: завтрак, обед, ужин, перекусы. Чего у человека нет — пропускается. */
export function personDay(plan: CookPlan, ration: Ration, day: RationDay, personId: string): PersonDay {
  const person = ration.people.find((p) => p.id === personId);
  const lines: MealLine[] = [];

  const extra = (id: string, meal: MealKind) => {
    const e = ration.extras.find((x) => x.id === id);
    const serving = e?.servings.find((s) => s.person === personId);
    if (e && serving) lines.push({ meal, name: e.name, detail: serving.text, kcal: serving.kcal, protein: serving.protein });
  };
  const dish = (id: string, meal: MealKind) => {
    const d = plan.dishes.find((x) => x.id === id);
    const portion = person?.portions.find((p) => p.dish === id);
    if (d && portion) lines.push({ meal, name: d.name, detail: portion.size, kcal: portion.kcal, protein: portion.protein });
  };

  if (day.breakfast) extra(day.breakfast, 'breakfast');
  dish(day.lunch, 'lunch');
  dish(day.dinner, 'dinner');
  day.snacks?.forEach((id) => extra(id, 'snack'));

  return {
    lines,
    kcal: lines.reduce((sum, l) => sum + l.kcal, 0),
    protein: lines.reduce((sum, l) => sum + l.protein, 0),
  };
}

/** Отклонение от цели в долях: 0.03 = на 3 % больше цели. */
export const deviation = (value: number, target: number) => (value - target) / target;

/**
 * Номер дня рациона «сегодня»: день 1 — следующий после дня, когда нажали «Начать готовку».
 * null — готовку не начинали или рацион уже закончился.
 */
export function rationToday(startedAt: number | null, days: number, now = new Date()): number | null {
  if (!startedAt) return null;
  const start = new Date(startedAt);
  const startDay = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const n = Math.round((today - startDay) / 86_400_000);
  return n >= 1 && n <= days ? n : null;
}
