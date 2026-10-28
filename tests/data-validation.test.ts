import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkMacros, checkPlan, checkRecipe, checkUniqueTitles, sumInUnit, validateProject, validateSources } from '../scripts/data-validation.ts';
import type { CookPlan } from '../src/types/cook-plan.gen.ts';
import type { Recipe } from '../src/types/recipe.gen.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const schemas = {
  recipeSchema: JSON.parse(await readFile(`${root}schemas/recipe.schema.json`, 'utf8')) as object,
  planSchema: JSON.parse(await readFile(`${root}schemas/cook-plan.schema.json`, 'utf8')) as object,
};

const plan = (): CookPlan => ({
  id: 'test-day',
  title: 'Тестовый день',
  summary: 'Минимальная техкарта для тестов.',
  start: '10:00',
  duration: { total: 60, active: 30 },
  conditions: { cooks: 1, kitchen: 'Плита и духовка' },
  equipment: [{ id: 'oven', name: 'Духовка', kind: 'oven' }],
  dishes: [{ id: 'soup', name: 'Суп', yield: { amount: 2, unit: 'l' }, portions: 4, packaging: [{ container: 'Банка 1 л', count: 2, storage: 'fridge', days: 3 }] }],
  ingredients: [
    { id: 'pumpkin', name: 'Тыква', amount: 1, unit: 'kg', section: 'produce' },
    { id: 'salt', name: 'Соль', amount: 1, unit: 'pack', section: 'spices', staple: true },
  ],
  steps: [
    { id: 's1', at: 0, duration: 20, title: 'Нарезать тыкву', dishes: ['soup'], uses: [{ ingredient: 'pumpkin', amount: 600, unit: 'g' }] },
    { id: 's2', at: 20, duration: 40, title: 'Запечь', passive: true, dishes: ['soup'], equipment: ['oven'], timer: { minutes: 40, label: 'Тыква' }, uses: [{ ingredient: 'salt', amount: 8, unit: 'g' }] },
  ],
});

const file = 'data/plans/test-day.json';
const messages = (issues: { message: string }[]) => issues.map((i) => i.message).join('\n');

describe('данные проекта', () => {
  it('все рецепты, техкарты и выпечка проходят проверку без ошибок и предупреждений', async () => {
    const { recipes, plans, kitchen, bakes, baking, issues } = await validateProject(root);
    expect(messages(issues)).toBe('');
    expect(recipes.length).toBeGreaterThan(0);
    expect(plans.length).toBeGreaterThan(0);
    expect(kitchen).not.toBeNull();
    expect(bakes.length).toBeGreaterThan(0);
    expect(baking).not.toBeNull();
  });
});

describe('JSON Schema', () => {
  const validate = (doc: unknown, kind: 'recipe' | 'plan') =>
    validateSources({
      ...schemas,
      recipeFiles: kind === 'recipe' ? [{ file: 'data/recipes/x.json', text: JSON.stringify(doc) }] : [],
      planFiles: kind === 'plan' ? [{ file, text: JSON.stringify(doc) }] : [],
    }).issues.filter((i) => i.severity === 'error');

  it('принимает минимальную техкарту', () => {
    expect(validate(plan(), 'plan')).toEqual([]);
  });

  it('не даёт техкарте сослаться на рецепт', () => {
    const errors = validate({ ...plan(), recipeId: 'borsch' }, 'plan');
    expect(messages(errors)).toContain('лишнее поле «recipeId»');
    const stepErrors = validate({ ...plan(), steps: [{ ...plan().steps[0]!, recipe: 'borsch' }] }, 'plan');
    expect(messages(stepErrors)).toContain('лишнее поле «recipe»');
  });

  it('техкарта не привязана к дате', () => {
    expect(messages(validate({ ...plan(), date: '2026-10-11' }, 'plan'))).toContain('лишнее поле «date»');
  });

  it('ловит невалидный JSON и неверные enum', () => {
    const broken = validateSources({ ...schemas, recipeFiles: [], planFiles: [{ file, text: '{ "id": ' }] });
    expect(messages(broken.issues)).toContain('Невалидный JSON');
    const badUnit = plan();
    (badUnit.ingredients[0] as { unit: string }).unit = 'grams';
    expect(messages(validate(badUnit, 'plan'))).toContain('допустимые значения');
  });

  it('требует от рецепта блок заморозки одного из двух видов', () => {
    const recipe = { freezing: { suitable: true, note: 'нет' } };
    const errors = validate(recipe, 'recipe');
    expect(errors.some((e) => e.path === '/freezing')).toBe(true);
  });
});

describe('смысловые проверки CookPlan', () => {
  it('валидная техкарта — без замечаний', () => {
    expect(checkPlan(plan(), file)).toEqual([]);
  });

  it('id должен совпадать с именем файла', () => {
    expect(messages(checkPlan(plan(), 'data/plans/other.json'))).toContain('должен совпадать с именем файла');
  });

  it('ловит ссылки на несуществующие блюда, технику и продукты', () => {
    const p = plan();
    p.steps[0] = { ...p.steps[0]!, dishes: ['stew'], equipment: ['grill'], uses: [{ ingredient: 'beet' }] };
    const text = messages(checkPlan(p, file));
    expect(text).toContain('нет блюда с id «stew»');
    expect(text).toContain('нет техники с id «grill»');
    expect(text).toContain('нет продукта с id «beet»');
  });

  it('шаги должны идти по времени и укладываться в день', () => {
    const p = plan();
    p.steps.reverse();
    p.steps[0] = { ...p.steps[0]!, duration: 90 };
    const text = messages(checkPlan(p, file));
    expect(text).toContain('по возрастанию at');
    expect(text).toContain('а весь день — 60 мин');
  });

  it('предупреждает, если по шагам расходуется больше, чем куплено', () => {
    const p = plan();
    p.steps[1] = { ...p.steps[1]!, uses: [{ ingredient: 'pumpkin', amount: 0.5, unit: 'kg' }] };
    const issues = checkPlan(p, file);
    expect(issues.every((i) => i.severity === 'warning')).toBe(true);
    expect(messages(issues)).toContain('расходуется 1.1 kg');
  });

  it('предупреждает о неиспользуемых продуктах и блюдах', () => {
    const p = plan();
    p.ingredients.push({ id: 'lime', name: 'Лайм', amount: 1, unit: 'pcs', section: 'produce' });
    p.dishes.push({ ...p.dishes[0]!, id: 'bread', name: 'Хлеб' });
    const text = messages(checkPlan(p, file));
    expect(text).toContain('«lime» не используется');
    expect(text).toContain('блюдо «bread» не упоминается');
  });

  it('соль — только граммами', () => {
    const p = plan();
    p.steps[0] = {
      ...p.steps[0]!,
      details: 'Нарезать кубиками, добавить щепотку соли.',
      uses: [...p.steps[0]!.uses!, { ingredient: 'salt', amount: 1, unit: 'tsp' }],
    };
    p.steps[1] = { ...p.steps[1]!, uses: [{ ingredient: 'salt', toTaste: true }] };
    expect(messages(checkPlan(p, file))).toBe(
      [
        'соль в «s1» — только граммами, без «по вкусу» и ложек',
        'в «s1» соль на глаз — укажите граммы',
        'соль в «s2» — только граммами, без «по вкусу» и ложек',
      ].join('\n'),
    );
    expect(checkPlan({ ...p, cooked: true }, file)).toEqual([]);
  });

  it('посуда и инструменты — не в большем числе шагов сразу, чем их есть', () => {
    const p = plan();
    p.equipment.push({ id: 'board', name: 'Доска', kind: 'tool' });
    p.steps = [
      { ...p.steps[0]!, equipment: ['board'] },
      { id: 's3', at: 10, duration: 5, title: 'Нарезать лук', dishes: ['soup'], equipment: ['board'] },
      p.steps[1]!,
    ];
    expect(messages(checkPlan(p, file))).toBe(
      'шаги «s1», «s3» одновременно берут «board», а в equipment — 1 шт.: возьмите другую посуду или сдвиньте шаг',
    );
    p.equipment[1] = { ...p.equipment[1]!, count: 2 };
    expect(checkPlan(p, file)).toEqual([]);
    expect(checkPlan({ ...p, cooked: true }, file)).toEqual([]);
  });

  it('шаг блюда в посуде, где оно ждёт, — то же место', () => {
    const p = plan();
    p.equipment.push({ id: 'pot', name: 'Кастрюля', kind: 'cookware' });
    p.steps = [
      p.steps[0]!,
      { ...p.steps[1]!, equipment: ['oven', 'pot'] },
      { id: 'cream', at: 30, duration: 2, title: 'Влить сливки', dishes: ['soup'], equipment: ['pot'] },
    ];
    expect(checkPlan(p, file)).toEqual([]);
    p.steps[2] = { id: 'rinse', at: 30, duration: 2, title: 'Сполоснуть кастрюлю', equipment: ['pot'] };
    expect(messages(checkPlan(p, file))).toContain('шаги «s2», «rinse» одновременно берут «pot»');
  });

  it('предупреждает о повторяющейся таре в фасовке', () => {
    const p = plan();
    const pack = p.dishes[0]!.packaging[0]!;
    p.dishes[0]!.packaging.push({ ...pack, count: 1, note: 'Обед, день 3' });
    const issues = checkPlan(p, file);
    expect(issues.every((i) => i.severity === 'warning')).toBe(true);
    expect(messages(issues)).toContain('«Банка 1 л» (fridge) уже есть в фасовке');
  });
});

describe('роли поваров', () => {
  const withRoles = (): CookPlan => {
    const p = plan();
    return {
      ...p,
      conditions: { ...p.conditions, cooks: 2 },
      roles: [
        { id: 'chef', name: 'Повар' },
        { id: 'helper', name: 'Помощник' },
      ],
      steps: [
        { ...p.steps[0]!, role: 'helper', zones: ['prep'] },
        { ...p.steps[1]!, role: 'chef' },
      ],
    };
  };

  it('техкарта с ролями — без замечаний', () => {
    expect(checkPlan(withRoles(), file)).toEqual([]);
  });

  it('с ролями у каждого шага должна быть существующая роль', () => {
    const p = withRoles();
    delete p.steps[0]!.role;
    p.steps[1] = { ...p.steps[1]!, role: 'sous' };
    const text = messages(checkPlan(p, file));
    expect(text).toContain('у шага «s1» нет роли');
    expect(text).toContain('нет роли с id «sous»');
  });

  it('роль без списка ролей и несовпадение с числом поваров', () => {
    const p = plan();
    p.steps[0] = { ...p.steps[0]!, role: 'chef' };
    expect(messages(checkPlan(p, file))).toContain('есть роль, но в техкарте нет roles');
    const q = withRoles();
    q.conditions.cooks = 3;
    expect(messages(checkPlan(q, file))).toContain('ролей 2, а поваров в conditions.cooks — 3');
  });

  it('с ролями у активного шага должны быть зоны, у пассивного — не нужны', () => {
    const p = withRoles();
    delete p.steps[0]!.zones;
    expect(messages(checkPlan(p, file))).toBe('у шага «s1» нет зон, а в техкарте заданы roles');
  });

  it('двое в одной зоне на одного человека — ошибка', () => {
    const p = withRoles();
    p.steps.splice(1, 0, { id: 's3', at: 0, duration: 15, title: 'Помыть доску', role: 'chef', zones: ['prep', 'hot'] });
    expect(messages(checkPlan(p, file))).toBe('«s1» и «s3» — разные роли одновременно в одной зоне (подготовка), 0–15-я минута');
  });

  it('разные зоны, хранение, своя роль и пассивные шаги — без замечаний', () => {
    const p = withRoles();
    const [cut, bake] = p.steps;
    p.steps = [
      cut!,
      { id: 'heat', at: 0, duration: 18, title: 'Разогреть сковороду', role: 'chef', zones: ['hot'] },
      { id: 'fridge-a', at: 18, duration: 2, title: 'Взять масло', role: 'chef', zones: ['cold'] },
      { id: 'fridge-b', at: 19, duration: 2, title: 'Убрать тыкву', role: 'helper', zones: ['cold'] },
      { id: 'rinse', at: 19, duration: 1, title: 'Сполоснуть нож', role: 'helper', zones: ['prep'] },
      bake!,
      { id: 'pack', at: 20, duration: 10, title: 'Разложить', role: 'chef', zones: ['pack'] },
      { id: 'cool', at: 25, duration: 10, title: 'Остывает', role: 'helper', passive: true, zones: ['pack'] },
    ];
    expect(checkPlan(p, file)).toEqual([]);
  });

  it('пауза в ходе работ — только отдыхом с таймером', () => {
    const p = withRoles();
    const [cut, bake] = p.steps;
    p.steps = [
      cut!,
      { id: 'heat', at: 0, duration: 10, title: 'Разогреть сковороду', role: 'chef', zones: ['hot'] },
      { id: 'taste', at: 15, duration: 5, title: 'Попробовать соль', role: 'chef', zones: ['hot'] },
      bake!,
    ];
    expect(messages(checkPlan(p, file))).toBe('у роли «chef» с 10-й по 15-ю минуту нет шага — паузу оформите отдыхом с таймером (rest)');

    const pause = { id: 'pause', at: 10, duration: 5, title: 'Отдых', role: 'chef', passive: true, rest: true, timer: { minutes: 5, label: 'Отдых' } };
    p.steps.splice(2, 0, pause);
    expect(checkPlan(p, file)).toEqual([]);

    p.steps[2] = { ...pause, passive: false, zones: ['hot'] };
    expect(messages(checkPlan(p, file))).toBe('отдых «pause» — пассивный шаг: нужен passive: true');
  });

  it('кто ставит в духовку, тот ведёт таймер', () => {
    const p = withRoles();
    const [cut, bake] = p.steps;
    p.steps = [
      { ...cut!, duration: 18 },
      { id: 'in', at: 18, duration: 2, title: 'Тыкву — в духовку', role: 'helper', zones: ['hot'], dishes: ['soup'], equipment: ['oven'] },
      bake!,
    ];
    expect(messages(checkPlan(p, file))).toBe(
      '«in» и «s2» — одна стадия у разных ролей: кто ставит на плиту или в духовку, тот включает таймер, мешает и снимает',
    );

    p.steps[2] = { ...bake!, role: 'helper' };
    expect(checkPlan(p, file)).toEqual([]);
  });

  it('ход работ уже приготовленной техкарты не проверяем', () => {
    const p = withRoles();
    p.steps.splice(1, 0, { id: 'taste', at: 15, duration: 5, title: 'Попробовать соль', role: 'chef', zones: ['hot'] });
    expect(messages(checkPlan(p, file))).toContain('нет шага — паузу оформите отдыхом');
    expect(checkPlan({ ...p, cooked: true }, file)).toEqual([]);
  });
});

describe('рацион техкарты', () => {
  const soupPortion = { dish: 'soup', size: '400 мл', kcal: 300, protein: 20, fat: 12, carbs: 25, reheat: 'В микроволновке 3 минуты' };
  const withRation = (): CookPlan => ({
    ...plan(),
    dishes: [
      {
        ...plan().dishes[0]!,
        packaging: [{ container: 'Банка 1 л', count: 2, storage: 'fridge', days: 3, person: 'ann', meals: [{ day: 1, meal: 'lunch' }, { day: 1, meal: 'dinner' }] }],
      },
    ],
    ration: {
      people: [{ id: 'ann', name: 'Аня', target: { kcal: 1000, protein: 60 }, portions: [{ ...soupPortion }] }],
      extras: [
        { id: 'porridge', name: 'Каша', meal: 'breakfast', servings: [{ person: 'ann', text: '60 г овсянки', kcal: 250, protein: 10 }] },
        { id: 'yogurt', name: 'Йогурт', meal: 'snack', servings: [{ person: 'ann', text: '200 г', kcal: 150, protein: 15 }] },
      ],
      days: [{ day: 1, breakfast: 'porridge', lunch: 'soup', dinner: 'soup', snacks: { afternoon: ['yogurt'] } }],
    },
  });

  it('валидный рацион — без замечаний', () => {
    expect(checkPlan(withRation(), file)).toEqual([]);
    const { issues } = validateSources({ ...schemas, recipeFiles: [], planFiles: [{ file, text: JSON.stringify(withRation()) }] });
    expect(issues.filter((i) => i.severity === 'error')).toEqual([]);
  });

  it('ловит ссылки на несуществующие блюда, перекусы и людей', () => {
    const p = withRation();
    p.ration!.days[0] = { day: 2, breakfast: 'yogurt', lunch: 'stew', dinner: 'soup', snacks: { morning: ['cake', 'yogurt'], evening: ['yogurt'] } };
    p.ration!.extras[1]!.servings.push({ person: 'bob', text: '100 г', kcal: 50, protein: 5 });
    const text = messages(checkPlan(p, file));
    expect(text).toContain('дни должны идти подряд с 1-го');
    expect(text).toContain('«yogurt» — перекус, а стоит в завтраке');
    expect(text).toContain('нет блюда с id «stew»');
    expect(text).toContain('нет завтрака или перекуса с id «cake»');
    expect(text).toContain('«yogurt» уже стоит в другом перекусе дня 2');
    expect(text).toContain('нет человека с id «bob»');
    expect(text).toContain('«porridge» не стоит ни в одном дне');
  });

  it('требует порцию каждого блюда дня у каждого человека', () => {
    const p = withRation();
    p.ration!.people[0]!.portions = [{ ...soupPortion }];
    p.dishes.push({ ...p.dishes[0]!, id: 'stew', name: 'Рагу' });
    p.steps[0] = { ...p.steps[0]!, dishes: ['soup', 'stew'] };
    p.ration!.days[0] = { ...p.ration!.days[0]!, dinner: 'stew' };
    expect(messages(checkPlan(p, file))).toContain('у Аня нет порции блюда «stew»');
  });

  it('предупреждает, если день далеко от цели по калориям и белку', () => {
    const p = withRation();
    delete p.ration!.days[0]!.snacks;
    p.ration!.people[0]!.target = { kcal: 1200, protein: 80 };
    const issues = checkPlan(p, file);
    expect(issues.every((i) => i.severity === 'warning')).toBe(true);
    expect(messages(issues)).toContain('день 1, Аня: 850 ккал при цели 1200 (-29 %)');
    expect(messages(issues)).toContain('белка 50 г при цели 80 г');
  });

  it('каждый обед и ужин рациона — ровно в одном контейнере своего блюда и человека', () => {
    const p = withRation();
    p.dishes[0]!.packaging = [
      { container: 'Банка 1 л', count: 2, storage: 'fridge', person: 'ann', meals: [{ day: 1, meal: 'lunch' }] },
      { container: 'Банка 0,5 л', count: 2, storage: 'freezer', person: 'bob', meals: [{ day: 1, meal: 'lunch' }, { day: 2, meal: 'lunch' }] },
      { container: 'Пакет', count: 1, storage: 'freezer', person: 'ann', meals: [{ day: 1, meal: 'lunch' }] },
    ];
    const text = messages(checkPlan(p, file));
    expect(text).toContain('приёмов пищи 1, а контейнеров 2');
    expect(text).toContain('нет человека с id «bob»');
    expect(text).toContain('в рационе на обед дня 2 не «soup»');
    expect(text).toContain('ужин дня 1 у Аня не лежит ни в одном контейнере');
    expect(text).toContain('обед дня 1 у Аня лежит в 2 контейнерах');
  });

  it('без рациона фасовка не ссылается на людей', () => {
    const p = withRation();
    delete p.ration;
    expect(messages(checkPlan(p, file))).toContain('фасовка ссылается на рацион, а рациона в техкарте нет');
  });

  it('проверяет КБЖУ порций и не даёт задать их второй раз в блюде', () => {
    const p = withRation();
    p.ration!.people[0]!.portions[0]!.fat = 40;
    p.dishes[0]!.nutrition = { kcal: 300, protein: 20, fat: 12, carbs: 25 };
    const text = messages(checkPlan(p, file));
    expect(text).toContain('калорийность 300 ккал не сходится с БЖУ');
    expect(text).toContain('КБЖУ блюда «soup» уже заданы в порциях рациона');
  });
});

describe('уникальные названия техкарт', () => {
  it('повтор названия — ошибка, без учёта регистра и «ё»', () => {
    const a = { doc: { title: 'Заготовки на неделю' }, file: 'data/plans/a.json' };
    const b = { doc: { title: 'заготовки на неделю' }, file: 'data/plans/b.json' };
    const c = { doc: { title: 'Ужин на шестерых' }, file: 'data/plans/c.json' };
    expect(checkUniqueTitles([a, c])).toEqual([]);
    expect(messages(checkUniqueTitles([a, b, c]))).toContain('уже есть в data/plans/a.json');
  });
});

describe('смысловые проверки Recipe', () => {
  const base = { id: 'x', time: { active: 10, total: 20 }, ingredients: [{ items: [{ name: 'Соль' }] }], steps: [{ steps: [{ text: 'Посолить' }] }], nutrition: { kcal: 100, protein: 5, fat: 4, carbs: 11 } } as unknown as Recipe;

  it('активное время не больше полного', () => {
    expect(messages(checkRecipe({ ...base, time: { active: 30, total: 20 } }, 'data/recipes/x.json'))).toContain('больше полного');
  });

  it('калории сверяются с БЖУ', () => {
    expect(checkMacros({ kcal: 100, protein: 5, fat: 4, carbs: 11 })).toBeNull();
    expect(checkMacros({ kcal: 500, protein: 5, fat: 4, carbs: 11 })).toContain('не сходится');
  });
});

describe('sumInUnit', () => {
  it('переводит граммы, килограммы и ложки', () => {
    expect(sumInUnit([{ amount: 500, unit: 'g' }, { amount: 0.25, unit: 'kg' }], 'kg')).toBe(0.75);
    expect(sumInUnit([{ amount: 2, unit: 'tbsp' }, { amount: 1, unit: 'tsp' }], 'ml')).toBe(35);
    expect(sumInUnit([{ amount: 2, unit: 'pcs' }], 'g')).toBeNull();
  });
});
