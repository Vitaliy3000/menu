import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkFoods, validateSources } from '../scripts/data-validation.ts';
import { bandCounts, bandOf, byGroup, filterFoods, indexFoods, parseFoodFilters, type FoodFilters } from '../src/lib/foods.ts';
import type { Foods } from '../src/types/foods.gen.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = async (path: string) => JSON.parse(await readFile(root + path, 'utf8')) as object;
const schemas = {
  recipeSchema: await read('schemas/recipe.schema.json'),
  planSchema: await read('schemas/cook-plan.schema.json'),
  foodsSchema: await read('schemas/foods.schema.json'),
};

const catalog = (): Foods => ({
  groups: [
    {
      id: 'vegetables',
      title: 'Овощи',
      items: [
        { id: 'potato-raw', name: 'Картофель, сырой', freezeScore: 10, losses: 'Темнеет и становится водянистым.' },
        { id: 'peas-blanched', name: 'Горошек, бланшированный', freezeScore: 90, months: 12, losses: 'Почти ничего.', sources: ['nchfp'] },
      ],
    },
    {
      id: 'stews',
      title: 'Рагу и блюда в соусе',
      items: [{ id: 'chili-con-carne', name: 'Чили кон карне', freezeScore: 95, months: 4, losses: 'Ничего.', sources: ['nchfp'] }],
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

  it('оценка — целое от 0 до 100 с шагом 5', () => {
    const f = catalog();
    f.groups[0]!.items[0]!.freezeScore = 12;
    f.groups[0]!.items[1]!.freezeScore = 105;
    const text = messages(validate(f));
    expect(text).toContain('must be multiple of 5');
    expect(text).toContain('must be <= 100');
  });

  it('ловит повторы и ссылки на несуществующие источники', () => {
    const f = catalog();
    f.groups[1]!.items.push({ id: 'potato-raw', name: 'картофель, сырой', freezeScore: 10, losses: 'Дубль.', sources: ['usda'] });
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
  const filters = (patch: Partial<FoodFilters> = {}): FoodFilters => ({ q: '', group: null, min: 0, sort: 'shelf', ...patch });
  const ids = (f: FoodFilters) => filterFoods(index, f).map((e) => e.food.id);

  it('полоса шкалы по оценке', () => {
    expect(bandOf(100).label).toBe('Не отличить');
    expect(bandOf(90).label).toBe('Почти без потерь');
    expect(bandOf(0).label).toBe('Не замораживать');
  });

  it('ищет по названию и группе, без учёта регистра и «ё»', () => {
    expect(ids(filters({ q: 'КАРТОФЕЛЬ' }))).toEqual(['potato-raw']);
    expect(ids(filters({ q: 'рагу' }))).toEqual(['chili-con-carne']);
  });

  it('порог, группа и сортировка', () => {
    expect(ids(filters({ min: 85 }))).toEqual(['peas-blanched', 'chili-con-carne']);
    expect(ids(filters({ group: 'vegetables', sort: 'best' }))).toEqual(['peas-blanched', 'potato-raw']);
    expect(ids(filters({ sort: 'worst' }))).toEqual(['potato-raw', 'peas-blanched', 'chili-con-carne']);
  });

  it('распределение и группировка', () => {
    const counts = bandCounts(index).filter((c) => c.count > 0).map((c) => [c.band.min, c.count]);
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
    expect(parseFoodFilters(new URLSearchParams('group=stews&min=70&sort=best'), foods.groups)).toEqual(
      filters({ group: 'stews', min: 70, sort: 'best' }),
    );
  });
});
