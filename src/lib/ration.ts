/** Рацион техкарты: что человек ест в конкретный день, откуда это взять и сколько это в сумме. Только арифметика над готовыми данными. */
import type { CookPlan, Dish, MealSlot, PackMeal, Packaging, Ration, RationDay, RationSnacks } from '../types/cook-plan.gen.ts';

/** Одна позиция приёма пищи: блюдо техкарты, завтрак или часть перекуса. */
export interface MealItem {
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

export interface MealLine {
  slot: MealSlot;
  items: MealItem[];
  kcal: number;
  protein: number;
}

export interface PersonDay {
  lines: MealLine[];
  kcal: number;
  protein: number;
}

const total = (xs: { kcal: number; protein: number }[]) => ({
  kcal: xs.reduce((sum, x) => sum + x.kcal, 0),
  protein: xs.reduce((sum, x) => sum + x.protein, 0),
});

/** Приёмы пищи одного человека в порядке дня: завтрак, перекус, обед, перекус, ужин, перекус. Чего у человека нет — пропускается. */
export function personDay(plan: CookPlan, ration: Ration, day: RationDay, personId: string): PersonDay {
  const person = ration.people.find((p) => p.id === personId);

  const extra = (id: string): MealItem[] => {
    const e = ration.extras.find((x) => x.id === id);
    const serving = e?.servings.find((s) => s.person === personId);
    return e && serving ? [{ name: e.name, detail: serving.text, kcal: serving.kcal, protein: serving.protein, how: e.how }] : [];
  };
  const dish = (meal: PackMeal['meal']): MealItem[] => {
    const d = plan.dishes.find((x) => x.id === day[meal]);
    const portion = person?.portions.find((p) => p.dish === day[meal]);
    if (!d || !portion) return [];
    return [{ name: d.name, detail: portion.size, kcal: portion.kcal, protein: portion.protein, how: portion.reheat, pack: packFor(d, personId, day.day, meal) }];
  };
  const snack = (slot: keyof RationSnacks) => (day.snacks?.[slot] ?? []).flatMap(extra);

  const slots: [MealSlot, MealItem[]][] = [
    ['breakfast', day.breakfast ? extra(day.breakfast) : []],
    ['morning', snack('morning')],
    ['lunch', dish('lunch')],
    ['afternoon', snack('afternoon')],
    ['dinner', dish('dinner')],
    ['evening', snack('evening')],
  ];
  const lines = slots.filter(([, items]) => items.length > 0).map(([slot, items]) => ({ slot, items, ...total(items) }));
  return { lines, ...total(lines) };
}

/** Строка фасовки, где лежит обед или ужин человека в этот день. */
export function packFor(dish: Dish, personId: string, day: number, meal: PackMeal['meal']): Packaging | undefined {
  return dish.packaging.find((p) => p.person === personId && p.meals?.some((m) => m.day === day && m.meal === meal));
}

export type ThawItem = MealItem & { slot: MealSlot; pack: Packaging };

/** Что вечером переложить из морозилки в холодильник: завтрашние обед и ужин человека, если они замороженные. */
export function thawTonight(plan: CookPlan, ration: Ration, day: RationDay, personId: string): ThawItem[] {
  // Дни идут подряд с 1-го, поэтому завтрашний лежит по индексу day.day.
  const tomorrow = ration.days[day.day];
  if (!tomorrow) return [];
  return personDay(plan, ration, tomorrow, personId).lines.flatMap((line) =>
    line.items.flatMap((item) => (item.pack?.storage === 'freezer' ? [{ ...item, slot: line.slot, pack: item.pack }] : [])),
  );
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
