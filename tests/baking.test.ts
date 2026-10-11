import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkBake, checkBaking, validateSources } from '../scripts/data-validation.ts';
import { actualLoad, bakerPercent, doughGrams, expectedDough, flourGrams, inFinal, panSummary, partGrams, roundGrams } from '../src/lib/baking.ts';
import type { Bake, Formula } from '../src/types/bake.gen.ts';
import type { Baking } from '../src/types/baking.gen.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = async (path: string) => JSON.parse(await readFile(root + path, 'utf8')) as object;
const schemas = {
  recipeSchema: await read('schemas/recipe.schema.json'),
  planSchema: await read('schemas/cook-plan.schema.json'),
  bakeSchema: await read('schemas/bake.schema.json'),
  bakingSchema: await read('schemas/baking.schema.json'),
};

/** Шокупан из канала: 324 г муки, юдане из 65 г муки и 65 г воды. */
const formula = (): Formula => ({
  parts: [{ id: 'yudane', name: 'Юдане' }],
  ingredients: [
    { name: 'Мука', grams: 324, flour: true, parts: { yudane: 65 } },
    { name: 'Вода', grams: 227, parts: { yudane: 65 } },
    { name: 'Соль', grams: 6.5 },
    { name: 'Дрожжи', grams: 3.2 },
  ],
});

const bake = (): Bake => ({
  id: 'test-bread',
  title: 'Тестовый хлеб',
  kind: 'pan',
  description: 'Минимальная рецептура для тестов.',
  methods: [
    {
      id: 'main',
      pan: { name: 'Форма с крышкой', volume: 2.2, lid: true, load: 255 },
      formula: formula(),
      stages: [{ title: 'Всё', steps: [{ text: 'Замесить тесто.', minutes: 10, minutesMax: 12, temp: 26, tempMax: 28 }] }],
    },
  ],
  attempts: [{ method: 'main', outcome: 'issues', notes: ['Поднялся до половины формы.'] }],
});

const baking = (): Baking => ({
  guides: [{ id: 'pullman', title: 'Pullman', summary: 'Как печь формовой хлеб.', sections: [{ title: 'Мука', points: ['Type 55.'] }] }],
  shopping: [{ title: 'Первый заказ', items: [{ name: 'Лезвие' }, { name: 'Пергамент' }] }],
  ideas: [{ title: 'Ромовая баба' }],
});

const file = 'data/bakes/test-bread.json';
const messages = (issues: { message: string }[]) => issues.map((i) => i.message).join('\n');
const validate = (doc: unknown) =>
  validateSources({
    ...schemas,
    recipeFiles: [],
    planFiles: [],
    bakeFiles: [{ file, text: JSON.stringify(doc) }],
    bakingFile: { file: 'data/baking.json', text: JSON.stringify(baking()) },
  }).issues.filter((i) => i.file !== 'data/recipes' && i.file !== 'data/plans');

describe('расчёты формулы', () => {
  it('пекарские проценты от муки', () => {
    const f = formula();
    expect(flourGrams(f)).toBe(324);
    expect(bakerPercent(227, 324)).toBeCloseTo(70.06, 2);
    expect(bakerPercent(10, 0)).toBe(0);
  });

  it('части теста и финальное тесто', () => {
    const f = formula();
    expect(doughGrams(f)).toBeCloseTo(560.7, 5);
    expect(partGrams(f, 'yudane')).toBe(130);
    expect(inFinal(f.ingredients[0]!)).toBe(259);
    expect(inFinal(f.ingredients[2]!)).toBe(6.5);
  });

  it('загрузка формы', () => {
    const f = formula();
    expect(expectedDough({ name: 'Форма', volume: 2.36, load: 255 })).toBeCloseTo(601.8, 5);
    expect(expectedDough({ name: 'Форма', volume: 2.36 })).toBeNull();
    expect(actualLoad(f, { name: 'Форма', volume: 2, count: 2 })).toBeCloseTo(140.2, 1);
    expect(actualLoad(f, { name: 'Противень' })).toBeNull();
  });

  it('округление граммов', () => {
    expect(roundGrams(4.3 - 1.1)).toBe(3.2);
    expect(roundGrams(273.3)).toBe(273);
    expect(roundGrams(19.54)).toBe(19.5);
  });

  it('подпись формы', () => {
    expect(panSummary({ name: 'Pullman', volume: 2.36, lid: true })).toBe('форма 2,36 л с крышкой');
    expect(panSummary({ name: 'Форма Agnelli', size: '30 × 23 см', count: 2 })).toBe('Форма Agnelli 30 × 23 см × 2');
  });
});

describe('рецептура выпечки', () => {
  it('валидная рецептура и справочник проходят', () => {
    expect(validate(bake())).toEqual([]);
  });

  it('схема не пускает лишние поля и неверный итог попытки', () => {
    const b = bake() as unknown as { recipeId?: string; attempts: { outcome: string }[] };
    b.recipeId = 'borsch';
    b.attempts[0]!.outcome = 'meh';
    const text = messages(validate(b));
    expect(text).toContain('лишнее поле «recipeId»');
    expect(text).toContain('допустимые значения: ok, issues, failed');
  });

  it('ловит ошибки в частях теста и муке', () => {
    const b = bake();
    const f = b.methods[0].formula;
    f.ingredients[1]!.parts = { yudane: 300 };
    f.ingredients[2]!.parts = { poolish: 1 };
    f.ingredients[0]!.flour = false;
    f.parts!.push({ id: 'levain', name: 'Закваска' });
    const text = messages(checkBake(b, file));
    expect(text).toContain('«Вода»: в части уходит 300 г — больше, чем всего (227 г)');
    expect(text).toContain('нет части «poolish» в formula.parts');
    expect(text).toContain('в часть «Закваска» не входит ни один ингредиент');
    expect(text).toContain('нет муки (flour: true)');
  });

  it('проверяет способы, диапазоны и попытки', () => {
    const b = bake();
    b.methods.push({ ...b.methods[0], id: 'straight' });
    b.methods[0].stages[0]!.steps[0] = { text: 'Замесить тесто.', minutes: 10, minutesMax: 10, temp: 28, tempMax: 26 };
    b.attempts![0]!.method = 'poolish';
    const text = messages(checkBake(b, file));
    expect(text).toContain('у способа «main» нет названия');
    expect(text).toContain('minutesMax (10) должен быть больше minutes (10)');
    expect(text).toContain('tempMax (26) должен быть больше temp (28)');
    expect(text).toContain('нет способа «poolish»');
  });

  it('предупреждает, когда тесто не сходится с загрузкой формы', () => {
    const b = bake();
    expect(checkBake(b, file)).toEqual([]);
    b.methods[0].pan = { name: 'Форма', volume: 2.2, count: 2, load: 150 };
    const [issue] = checkBake(b, file);
    expect(issue?.severity).toBe('warning');
    expect(issue?.message).toBe('теста 561 г, а по загрузке формы (150 г/л × 2.2 л × 2) ждём ≈ 660 г');
  });

  it('id совпадает с именем файла, названия уникальны', () => {
    const { issues } = validateSources({
      ...schemas,
      recipeFiles: [],
      planFiles: [],
      bakeFiles: [
        { file: 'data/bakes/bread-a.json', text: JSON.stringify({ ...bake(), id: 'bread-a' }) },
        { file: 'data/bakes/bread-b.json', text: JSON.stringify({ ...bake(), id: 'bread-c', title: 'тестовый хлеб' }) },
      ],
      bakingFile: { file: 'data/baking.json', text: JSON.stringify(baking()) },
    });
    const text = messages(issues);
    expect(text).toContain('id «bread-c» должен совпадать с именем файла «bread-b»');
    expect(text).toContain('название «тестовый хлеб» уже есть в data/bakes/bread-a.json');
  });
});

describe('справочник выпечки', () => {
  it('без файла — ошибка', () => {
    const { issues } = validateSources({ ...schemas, recipeFiles: [], planFiles: [], bakeFiles: [], bakingFile: null });
    expect(messages(issues)).toContain('Нет справочника выпечки');
  });

  it('ловит повторы и пустые разделы', () => {
    const k = baking();
    k.guides.push({ ...k.guides[0]!, sections: [{ title: 'Пусто' }] });
    k.shopping.push({ title: 'Позже', items: [{ name: 'лезвие' }] });
    k.ideas!.push({ title: 'ромовая баба' });
    const text = messages(checkBaking(k, 'data/baking.json'));
    expect(text).toContain('id «pullman» повторяется');
    expect(text).toContain('в разделе «Пусто» нет ни текста, ни пунктов');
    expect(text).toContain('«лезвие» уже есть в списке покупок («Первый заказ»)');
    expect(text).toContain('идея «ромовая баба» указана дважды');
  });
});
