import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateSources } from '../scripts/data-validation.ts';
import type { Foods } from '../src/types/foods.gen.ts';
import type { TasteProfile } from '../src/types/taste-profile.gen.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = async (path: string) => JSON.parse(await readFile(root + path, 'utf8')) as object;
const schemas = {
  recipeSchema: await read('schemas/recipe.schema.json'),
  planSchema: await read('schemas/cook-plan.schema.json'),
  foodsSchema: await read('schemas/foods.schema.json'),
  tasteProfileSchema: await read('schemas/taste-profile.schema.json'),
};

const catalog: Foods = {
  groups: [
    {
      id: 'soups',
      title: 'Супы',
      items: [
        {
          id: 'borscht',
          name: 'Борщ',
          cuisines: ['ukrainian'],
          taste: { sweet: 3, sour: 4, salty: 5, bitter: 0, umami: 4, heat: 0, fat: 3 },
          aroma: { earthy: 6, dill: 3 },
          microwaveScore: 100,
          freezeScore: 95,
          losses: 'Почти ничего.',
        },
      ],
    },
  ],
  sources: [],
};

const preference = { liking: 0, max: 5 };
const nothing: TasteProfile['methods']['eggs'] = [];
const profile = (): TasteProfile => ({
  id: 'anna',
  name: 'Анна',
  answered: '2026-10-29',
  summary: 'Любит борщ и укроп, острое не ест, новое пробует, если похоже на знакомое.',
  novelty: 'similar',
  diet: [],
  taste: {
    sweet: preference,
    sweetSavory: preference,
    sour: preference,
    salty: preference,
    bitter: preference,
    umami: preference,
    heat: { liking: -2, max: 1 },
    fat: preference,
  },
  aroma: { dill: 1 },
  cuisines: { ukrainian: 2 },
  foods: { borscht: 2 },
  methods: {
    chicken: ['grilled', 'boiled'],
    duck: nothing,
    beef: ['braised'],
    pork: nothing,
    lamb: nothing,
    mince: ['grilled'],
    'white-fish': ['baked'],
    'fatty-fish': ['cured'],
    'shrimp-squid': nothing,
    'mussels-oysters': nothing,
    liver: nothing,
    'foie-gras': nothing,
    offal: nothing,
    eggs: ['grilled', 'boiled'],
  },
  textures: ['slimy'],
  untried: { aroma: { lemongrass: 0 }, cuisines: { thai: -1 }, foods: {} },
});

const file = 'data/taste-profiles/anna.json';
const messages = (doc: unknown) =>
  validateSources({
    ...schemas,
    recipeFiles: [],
    planFiles: [],
    foodsFile: { file: 'data/foods.json', text: JSON.stringify(catalog) },
    tasteProfileFiles: [{ file, text: JSON.stringify(doc) }],
  })
    .issues.filter((i) => i.file === file)
    .map((i) => i.message)
    .join('\n');

describe('вкусовой профиль', () => {
  it('валидный профиль проходит', () => {
    expect(messages(profile())).toBe('');
  });

  it('оценки от −2 до 2, у вкуса обе границы', () => {
    const p = profile() as unknown as Record<string, Record<string, unknown>>;
    p.aroma!.dill = 3;
    p.taste!.fat = { liking: 1 };
    const text = messages(p);
    expect(text).toContain('must be <= 2');
    expect(text).toContain('нет обязательного поля «max»');
  });

  it('способы — по каждому продукту и из словаря, интерес от −1 до 1', () => {
    const p = profile() as unknown as { methods: Record<string, unknown>; textures: string[]; untried: { cuisines: Record<string, number> } };
    delete p.methods.offal;
    p.methods.beef = ['sous-vide'];
    p.textures.push('crunchy');
    p.untried.cuisines.thai = 2;
    const text = messages(p);
    expect(text).toContain('нет обязательного поля «offal»');
    expect(text).toContain('допустимые значения: grilled');
    expect(text).toContain('допустимые значения: jelly');
    expect(text).toContain('must be <= 1');
  });

  it('ноты, кухни и позиции — только из каталога', () => {
    const p = profile();
    p.aroma.smell = 1;
    p.cuisines.martian = 2;
    p.foods['pumpkin-soup'] = -2;
    p.untried.foods.kimchi = 1;
    const text = messages(p);
    expect(text).toContain('неизвестная нота аромата «smell»');
    expect(text).toContain('неизвестная кухня «martian»');
    expect(text).toContain('неизвестная позиция каталога «pumpkin-soup»');
    expect(text).toContain('неизвестная позиция каталога «kimchi»');
  });

  it('неопробованное не оценено, id совпадает с именем файла', () => {
    const p = profile();
    p.id = 'anya';
    p.untried.cuisines.ukrainian = 0;
    const text = messages(p);
    expect(text).toContain('«ukrainian» уже оценена в cuisines');
    expect(text).toContain('id «anya» должен совпадать с именем файла «anna»');
  });
});
