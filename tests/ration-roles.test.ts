import { describe, expect, it } from 'vitest';
import { doneStepCount, gotCount, mySteps, roleTimes, shoppingKeys } from '../src/lib/plan.ts';
import type { PlanProgress } from '../src/lib/progress.ts';
import { personDay, rationToday, thawTonight } from '../src/lib/ration.ts';
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
  dishes: [
    {
      id: 'soup',
      name: 'Суп',
      yield: { amount: 2, unit: 'l' },
      portions: 4,
      packaging: [
        { container: 'Банка 1 л', count: 2, storage: 'fridge', person: 'ann', meals: [{ day: 1, meal: 'lunch' }, { day: 1, meal: 'dinner' }] },
        { container: 'Пакет', count: 2, storage: 'freezer', person: 'ann', meals: [{ day: 2, meal: 'lunch' }, { day: 2, meal: 'dinner' }] },
      ],
    },
  ],
  ingredients: [{ id: 'carrot', name: 'Морковь', amount: 1, unit: 'kg', section: 'produce' }],
  steps: [
    { id: 'cut', at: 0, duration: 10, title: 'Нарезать морковь', role: 'helper', dishes: ['soup'] },
    { id: 'boil', at: 0, duration: 30, title: 'Сварить суп', role: 'chef', dishes: ['soup'] },
    { id: 'wash', at: 10, duration: 10, title: 'Помыть посуду', role: 'helper' },
  ],
  ration: {
    people: [
      {
        id: 'ann',
        name: 'Аня',
        target: { kcal: 900 },
        portions: [{ dish: 'soup', size: '400 мл', kcal: 300, protein: 20, fat: 12, carbs: 25, reheat: { methods: ['microwave'], active: 1, total: 4, text: 'В микроволновке 3 минуты' } }],
      },
    ],
    extras: [
      { id: 'porridge', name: 'Каша', meal: 'breakfast', how: 'Сварить на воде', servings: [{ person: 'ann', text: '60 г овсянки', kcal: 250, protein: 10 }] },
      { id: 'shake', name: 'Коктейль', meal: 'snack', servings: [{ person: 'bob', text: '30 г протеина', kcal: 120, protein: 24 }] },
      { id: 'apple', name: 'Яблоко', meal: 'snack', servings: [{ person: 'ann', text: '1 яблоко', kcal: 80, protein: 0 }] },
      { id: 'nuts', name: 'Орехи', meal: 'snack', servings: [{ person: 'ann', text: '20 г', kcal: 130, protein: 3 }] },
    ],
    days: [
      { day: 1, breakfast: 'porridge', lunch: 'soup', dinner: 'soup', snacks: { morning: ['shake'], evening: ['apple', 'nuts'] } },
      { day: 2, lunch: 'soup', dinner: 'soup' },
    ],
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

describe('длительность по ролям', () => {
  it('у каждого — от первого шага до последнего и сколько заняты руки', () => {
    const times = roleTimes({
      ...plan,
      steps: [
        { id: 'cut', at: 5, duration: 10, title: 'Нарезать морковь', role: 'helper' },
        { id: 'boil', at: 0, duration: 30, title: 'Суп варится', role: 'chef', passive: true },
        { id: 'stir', at: 10, duration: 10, title: 'Помешивать', role: 'chef' },
        { id: 'taste', at: 15, duration: 10, title: 'Попробовать соль', role: 'chef' },
        { id: 'wash', at: 15, duration: 10, title: 'Помыть посуду', role: 'helper' },
      ],
    });
    expect(times?.map((t) => [t.role.id, t.total, t.active])).toEqual([
      ['chef', 30, 15],
      ['helper', 20, 20],
    ]);
  });

  it('без ролей — только общая длительность', () => {
    expect(roleTimes({ ...plan, roles: undefined })).toBeNull();
  });
});

describe('список покупок', () => {
  it('включает инвентарь с buy под отдельным ключом', () => {
    expect(shoppingKeys(plan)).toEqual(['carrot', 'eq:foil']);
    expect(gotCount(plan, progress({ got: ['eq:foil', 'oven'] }))).toBe(1);
  });
});

describe('рацион', () => {
  it('идёт по порядку дня и складывает в перекус только свои позиции', () => {
    const day = personDay(plan, plan.ration!, plan.ration!.days[0]!, 'ann');
    expect(day.lines.map((l) => [l.slot, l.items.map((i) => i.name)])).toEqual([
      ['breakfast', ['Каша']],
      ['lunch', ['Суп']],
      ['dinner', ['Суп']],
      ['evening', ['Яблоко', 'Орехи']],
    ]);
    expect(day.lines[3]).toMatchObject({ kcal: 210, protein: 3 });
    expect(day.kcal).toBe(1060);
    expect(day.protein).toBe(53);
  });

  it('у обеда и ужина — контейнер из фасовки и как греть, у завтрака — как готовить', () => {
    const [breakfast, lunch] = personDay(plan, plan.ration!, plan.ration!.days[0]!, 'ann').lines.map((l) => l.items[0]);
    expect(breakfast).toMatchObject({ how: 'Сварить на воде' });
    expect(breakfast!.pack).toBeUndefined();
    expect(lunch).toMatchObject({ how: 'В микроволновке 3 минуты', pack: { container: 'Банка 1 л', storage: 'fridge' } });
  });

  it('вечером — переложить из морозилки завтрашние обед и ужин', () => {
    const [day1, day2] = plan.ration!.days;
    expect(thawTonight(plan, plan.ration!, day1, 'ann').map((l) => [l.slot, l.pack.container])).toEqual([
      ['lunch', 'Пакет'],
      ['dinner', 'Пакет'],
    ]);
    expect(thawTonight(plan, plan.ration!, day2!, 'ann')).toEqual([]);
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
