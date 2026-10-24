/** Рацион техкарты: что человек ест в конкретный день, откуда это взять и сколько это в сумме. Только арифметика над готовыми данными. */
import type { CookPlan, Dish, PackMeal, Packaging, Ration, RationDay } from '../types/cook-plan.gen.ts';

export type MealKind = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealLine {
  meal: MealKind;
  /** Название блюда или перекуса. */
  name: string;
  /** Размер порции или состав. */
  detail: string;
  kcal: number;
  protein: number;
  /** Как приготовить или разогреть. */
  how?: string;
  /** Обед или ужин: строка фасовки, откуда его взять. */
  pack?: Packaging;
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
    if (e && serving) lines.push({ meal, name: e.name, detail: serving.text, kcal: serving.kcal, protein: serving.protein, how: e.how });
  };
  const dish = (id: string, meal: PackMeal['meal']) => {
    const d = plan.dishes.find((x) => x.id === id);
    const portion = person?.portions.find((p) => p.dish === id);
    if (d && portion) {
      const pack = packFor(d, personId, day.day, meal);
      lines.push({ meal, name: d.name, detail: portion.size, kcal: portion.kcal, protein: portion.protein, how: portion.reheat, pack });
    }
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

/** Строка фасовки, где лежит обед или ужин человека в этот день. */
export function packFor(dish: Dish, personId: string, day: number, meal: PackMeal['meal']): Packaging | undefined {
  return dish.packaging.find((p) => p.person === personId && p.meals?.some((m) => m.day === day && m.meal === meal));
}

/** Что вечером переложить из морозилки в холодильник: завтрашние обед и ужин человека, если они замороженные. */
export function thawTonight(plan: CookPlan, ration: Ration, day: RationDay, personId: string): (MealLine & { pack: Packaging })[] {
  // Дни идут подряд с 1-го, поэтому завтрашний лежит по индексу day.day.
  const tomorrow = ration.days[day.day];
  if (!tomorrow) return [];
  return personDay(plan, ration, tomorrow, personId).lines.filter((l): l is MealLine & { pack: Packaging } => l.pack?.storage === 'freezer');
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
