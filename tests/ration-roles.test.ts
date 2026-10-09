import { describe, expect, it } from 'vitest';
import { doneStepCount, gotCount, mySteps, shoppingKeys } from '../src/lib/plan.ts';
import type { PlanProgress } from '../src/lib/progress.ts';
import { personDay, rationToday } from '../src/lib/ration.ts';
import type { CookPlan } from '../src/types/cook-plan.gen.ts';

const plan: CookPlan = {
  id: 'two-cooks',
  title: 'Двое на кухне',
  summary: 'Минимальная техкарта с ролями и рационом.',
  duration: { total: 30, active: 30 },
  conditions: { cooks: 2, kitchen: 'Плита и духовка' },
  roles: [
    { id: 'chef', name: 'Повар' },
    { id: 'helper', name: 'Помощник' },
  ],
  equipment: [
    { id: 'oven', name: 'Духовка', kind: 'oven' },
    { id: 'foil', name: 'Фольга', kind: 'consumable', buy: true },
  ],
  dishes: [{ id: 'soup', name: 'Суп', yield: { amount: 2, unit: 'l' }, portions: 4, packaging: [{ container: 'Банка 1 л', count: 2, storage: 'fridge' }] }],
  ingredients: [{ id: 'carrot', name: 'Морковь', amount: 1, unit: 'kg', section: 'produce' }],
  steps: [
    { id: 'cut', at: 0, duration: 10, title: 'Нарезать морковь', role: 'helper', dishes: ['soup'] },
    { id: 'boil', at: 0, duration: 30, title: 'Сварить суп', role: 'chef', dishes: ['soup'] },
    { id: 'wash', at: 10, duration: 10, title: 'Помыть посуду', role: 'helper' },
  ],
  ration: {
    people: [{ id: 'ann', name: 'Аня', target: { kcal: 900 }, portions: [{ dish: 'soup', size: '400 мл', kcal: 300, protein: 20 }] }],
    extras: [
      { id: 'porridge', name: 'Каша', meal: 'breakfast', servings: [{ person: 'ann', text: '60 г овсянки', kcal: 250, protein: 10 }] },
      { id: 'shake', name: 'Коктейль', meal: 'snack', servings: [{ person: 'bob', text: '30 г протеина', kcal: 120, protein: 24 }] },
    ],
    days: [{ day: 1, breakfast: 'porridge', lunch: 'soup', dinner: 'soup', snacks: ['shake'] }],
  },
};

const progress = (patch: Partial<PlanProgress> = {}): PlanProgress => ({ done: [], got: [], prep: [], startedAt: null, ...patch });

describe('роли на устройстве', () => {
  it('без выбранной роли — все шаги', () => {
    expect(mySteps(plan, progress()).map((s) => s.id)).toEqual(['cut', 'boil', 'wash']);
  });

  it('с ролью — только её шаги, и счётчик считает только их', () => {
    const p = progress({ role: 'helper', done: ['cut', 'boil'] });
    expect(mySteps(plan, p).map((s) => s.id)).toEqual(['cut', 'wash']);
    expect(doneStepCount(plan, p)).toBe(1);
  });

  it('неизвестная роль из старого прогресса не прячет шаги', () => {
    expect(mySteps(plan, progress({ role: 'sous' }))).toHaveLength(3);
  });
});

describe('список покупок', () => {
  it('включает инвентарь с buy под отдельным ключом', () => {
    expect(shoppingKeys(plan)).toEqual(['carrot', 'eq:foil']);
    expect(gotCount(plan, progress({ got: ['eq:foil', 'oven'] }))).toBe(1);
  });
});

describe('рацион', () => {
  it('складывает завтрак, обед, ужин и только свои перекусы', () => {
    const day = personDay(plan, plan.ration!, plan.ration!.days[0]!, 'ann');
    expect(day.lines.map((l) => l.meal)).toEqual(['breakfast', 'lunch', 'dinner']);
    expect(day.kcal).toBe(850);
    expect(day.protein).toBe(50);
  });

  it('день рациона считается от даты старта готовки', () => {
    const start = new Date(2026, 9, 11, 10, 0).getTime();
    expect(rationToday(start, 14, new Date(2026, 9, 11, 22, 0))).toBeNull();
    expect(rationToday(start, 14, new Date(2026, 9, 12, 8, 0))).toBe(1);
    expect(rationToday(start, 14, new Date(2026, 9, 25, 8, 0))).toBe(14);
    expect(rationToday(start, 14, new Date(2026, 9, 26, 8, 0))).toBeNull();
    expect(rationToday(null, 14)).toBeNull();
  });
});
