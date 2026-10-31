import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkFoods, validateSources } from '../scripts/data-validation.ts';
import { AROMA_NOTES, ranked, TASTES } from '../src/lib/flavor.ts';
import { bandCounts, bandOf, byGroup, filterFoods, indexFoods, parseFoodFilters, type FoodFilters } from '../src/lib/foods.ts';
import type { Foods, Taste } from '../src/types/foods.gen.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = async (path: string) => JSON.parse(await readFile(root + path, 'utf8')) as object;
const schemas = {
  recipeSchema: await read('schemas/recipe.schema.json'),
  planSchema: await read('schemas/cook-plan.schema.json'),
  foodsSchema: await read('schemas/foods.schema.json'),
};

const taste = (patch: Partial<Taste> = {}): Taste => ({ sweet: 0, sour: 0, salty: 0, bitter: 0, umami: 0, heat: 0, fat: 0, ...patch });

const catalog = (): Foods => ({
  groups: [
    {
      id: 'vegetables',
      title: 'Овощи',
      items: [
        {
          id: 'potato-raw',
          name: 'Картофель, сырой',
          cuisines: ['russian', 'dutch'],
          taste: taste({ sweet: 1, salty: 3, umami: 2 }),
          aroma: { earthy: 5 },
          microwaveScore: 65,
          freezeScore: 10,
          losses: 'Темнеет и становится водянистым.',
        },
        {
          id: 'peas-blanched',
          name: 'Горошек, бланшированный',
          taste: taste({ sweet: 4, umami: 3 }),
          aroma: { green: 6, beany: 2 },
          microwaveScore: 85,
          freezeScore: 90,
          months: 12,
          losses: 'Почти ничего.',
          sources: ['nchfp'],
        },
      ],
    },
    {
      id: 'stews',
      title: 'Рагу и блюда в соусе',
      items: [
        {
          id: 'chili-con-carne',
          name: 'Чили кон карне',
          cuisines: ['american', 'mexican'],
          taste: taste({ sweet: 2, sour: 3, salty: 5, umami: 6, heat: 5, fat: 5 }),
          aroma: { cumin: 6, chili: 6, meaty: 5 },
          microwaveScore: 95,
          freezeScore: 95,
          months: 4,
          losses: 'Ничего.',
          sources: ['nchfp'],
        },
      ],
    },
  ],
  sources: [{ id: 'nchfp', title: 'NCHFP — Freezing', url: 'https://nchfp.uga.edu/how/freeze/' }],
});

const file = 'data/foods.json';
const messages = (issues: { message: string }[]) => issues.map((i) => i.message).join('\n');
const validate = (doc: unknown) =>
  validateSources({ ...schemas, recipeFiles: [], planFiles: [], foodsFile: { file, text: JSON.stringify(doc) } }).issues.filter(
    (i) => i.file === file,
  );

describe('каталог продуктов: проверка', () => {
  it('валидный каталог проходит', () => {
    expect(validate(catalog())).toEqual([]);
  });

  it('без файла — ошибка', () => {
    const { issues } = validateSources({ ...schemas, recipeFiles: [], planFiles: [], foodsFile: null });
    expect(messages(issues)).toContain('Нет каталога продуктов');
  });

  it('оценки — целые от 0 до 100 с шагом 5', () => {
    const f = catalog();
    f.groups[0]!.items[0]!.freezeScore = 12;
    f.groups[0]!.items[1]!.freezeScore = 105;
    f.groups[1]!.items[0]!.microwaveScore = -5;
    const text = messages(validate(f));
    expect(text).toContain('must be multiple of 5');
    expect(text).toContain('must be <= 100');
    expect(text).toContain('must be >= 0');
  });

  it('вкус 0–10 по всем семи ключам, ноты аромата и кухни — только из словаря', () => {
    const f = catalog() as unknown as { groups: { items: Record<string, unknown>[] }[] };
    const [potato, peas] = f.groups[0]!.items;
    potato!.taste = { ...taste(), sweet: 11 };
    potato!.aroma = { earthy: 0, smell: 3 };
    potato!.cuisines = ['martian'];
    delete (peas!.taste as Partial<Taste>).fat;
    const text = messages(validate(f));
    expect(text).toContain('must be <= 10');
    expect(text).toContain('must be >= 1');
    expect(text).toContain('лишнее поле «smell»');
    expect(text).toContain('допустимые значения: russian');
    expect(text).toContain('нет обязательного поля «fat»');
  });

  it('ловит повторы и ссылки на несуществующие источники', () => {
    const f = catalog();
    f.groups[1]!.items.push({ id: 'potato-raw', name: 'картофель, сырой', taste: taste(), microwaveScore: 65, freezeScore: 10, losses: 'Дубль.', sources: ['usda'] });
    f.sources.push({ id: 'unused', title: 'NCHFP — копия', url: 'https://nchfp.uga.edu/how/freeze/' });
    const text = messages(checkFoods(f, file));
    expect(text).toContain('id «potato-raw» повторяется');
    expect(text).toContain('«картофель, сырой» уже есть в каталоге');
    expect(text).toContain('нет источника «usda»');
    expect(text).toContain('ссылка https://nchfp.uga.edu/how/freeze/ уже есть в другом источнике');
    expect(text).toContain('на источник «unused» не ссылается ни одна позиция');
  });
});

describe('каталог продуктов: фильтры', () => {
  const foods = catalog();
  const index = indexFoods(foods);
  const filters = (patch: Partial<FoodFilters> = {}): FoodFilters => ({ q: '', group: null, min: 0, sort: 'shelf', scale: 'freeze', ...patch });
  const ids = (f: FoodFilters) => filterFoods(index, f).map((e) => e.food.id);

  it('полоса шкалы по оценке', () => {
    expect(bandOf(100, 'freeze').label).toBe('Не отличить');
    expect(bandOf(90, 'freeze').label).toBe('Почти без потерь');
    expect(bandOf(0, 'freeze').label).toBe('Не замораживать');
    expect(bandOf(30, 'microwave').label).toBe('Только поесть');
    expect(bandOf(0, 'microwave').label).toBe('Не греть');
  });

  it('ищет по названию, группе и кухне, без учёта регистра и «ё»', () => {
    expect(ids(filters({ q: 'КАРТОФЕЛЬ' }))).toEqual(['potato-raw']);
    expect(ids(filters({ q: 'рагу' }))).toEqual(['chili-con-carne']);
    expect(ids(filters({ q: 'мексиканск' }))).toEqual(['chili-con-carne']);
  });

  it('порог, группа и сортировка', () => {
    expect(ids(filters({ min: 85 }))).toEqual(['peas-blanched', 'chili-con-carne']);
    expect(ids(filters({ group: 'vegetables', sort: 'best' }))).toEqual(['peas-blanched', 'potato-raw']);
    expect(ids(filters({ sort: 'worst' }))).toEqual(['potato-raw', 'peas-blanched', 'chili-con-carne']);
  });

  it('порог и распределение — по выбранной шкале', () => {
    expect(ids(filters({ min: 50 }))).toEqual(['peas-blanched', 'chili-con-carne']);
    expect(ids(filters({ min: 50, scale: 'microwave' }))).toEqual(['potato-raw', 'peas-blanched', 'chili-con-carne']);
    const counts = bandCounts(index, 'microwave').filter((c) => c.count > 0).map((c) => [c.band.min, c.count]);
    expect(counts).toEqual([
      [95, 1],
      [85, 1],
      [50, 1],
    ]);
  });

  it('распределение и группировка', () => {
    const counts = bandCounts(index, 'freeze').filter((c) => c.count > 0).map((c) => [c.band.min, c.count]);
    expect(counts).toEqual([
      [95, 1],
      [85, 1],
      [10, 1],
    ]);
    expect(byGroup(filterFoods(index, filters())).map((g) => [g.group.id, g.entries.length])).toEqual([
      ['vegetables', 2],
      ['stews', 1],
    ]);
  });

  it('из URL берёт только известные группы, пороги и сортировки', () => {
    const parsed = parseFoodFilters(new URLSearchParams('group=nope&min=42&sort=random&q=лук'), foods.groups);
    expect(parsed).toEqual(filters({ q: 'лук' }));
    expect(parseFoodFilters(new URLSearchParams('group=stews&min=70&sort=best&scale=microwave'), foods.groups)).toEqual(
      filters({ group: 'stews', min: 70, sort: 'best', scale: 'microwave' }),
    );
    expect(parseFoodFilters(new URLSearchParams('scale=oven'), foods.groups)).toEqual(filters());
  });
});

describe('каталог продуктов: вкус и аромат', () => {
  it('ненулевые уровни по убыванию, равные — в порядке записи', () => {
    expect(ranked(taste({ salty: 5, umami: 6, heat: 5 }), TASTES)).toEqual([
      { label: 'умами', value: 6 },
      { label: 'солёность', value: 5 },
      { label: 'острота', value: 5 },
    ]);
    expect(ranked({ cumin: 6, chili: 6, meaty: 5 }, AROMA_NOTES).map((l) => l.label)).toEqual(['зира', 'чили', 'мясо и бульон']);
  });
});
