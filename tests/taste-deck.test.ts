import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateSources } from '../scripts/data-validation.ts';
import type { Foods } from '../src/types/foods.gen.ts';
import type { TasteDeck } from '../src/types/taste-deck.gen.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = async (path: string) => JSON.parse(await readFile(root + path, 'utf8')) as object;
const schemas = {
  recipeSchema: await read('schemas/recipe.schema.json'),
  planSchema: await read('schemas/cook-plan.schema.json'),
  foodsSchema: await read('schemas/foods.schema.json'),
  tasteDeckSchema: await read('schemas/taste-deck.schema.json'),
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
          taste: { sweet: 3, sour: 4, salty: 5, bitter: 0, umami: 4, heat: 0, fat: 3 },
          aroma: { earthy: 6, dill: 3 },
          freezeScore: 95,
          losses: 'Почти ничего.',
        },
      ],
    },
  ],
  sources: [],
};

const deck = (): TasteDeck => ({
  series: [{ id: 'soups', title: 'Супы', varies: 'кислое и острое' }],
  cards: [
    {
      id: 'borscht',
      name: 'Борщ',
      caption: 'Свекольный суп со сметаной',
      series: 'soups',
      foods: ['borscht'],
      circle: 1,
      style: 'home',
      complexity: 2,
      weight: 'medium',
      protein: 'beef',
      method: 'boiled',
      photo: { source: 'https://commons.wikimedia.org/wiki/File:Borscht.jpg', author: 'Автор', license: 'CC BY-SA 4.0' },
    },
  ],
});

const file = 'data/taste-deck.json';
const messages = (doc: unknown) =>
  validateSources({
    ...schemas,
    recipeFiles: [],
    planFiles: [],
    foodsFile: { file: 'data/foods.json', text: JSON.stringify(catalog) },
    tasteDeckFile: { file, text: JSON.stringify(doc) },
  })
    .issues.filter((i) => i.file === file)
    .map((i) => i.message)
    .join('\n');

describe('колода анкеты', () => {
  it('валидная колода проходит', () => {
    expect(messages(deck())).toBe('');
  });

  it('метки — из словарей схемы', () => {
    const d = deck() as unknown as { cards: Record<string, unknown>[] };
    d.cards[0]!.circle = 5;
    d.cards[0]!.method = 'sous-vide';
    d.cards[0]!.textures = ['crunchy'];
    const text = messages(d);
    expect(text).toContain('must be <= 4');
    expect(text).toContain('допустимые значения: grilled');
    expect(text).toContain('допустимые значения: jelly');
  });

  it('серии и позиции существуют, id не повторяются', () => {
    const d = deck();
    d.cards.push({ ...d.cards[0]!, series: 'desserts', foods: ['medovik'] });
    d.series.push({ id: 'salads', title: 'Салаты', varies: 'майонез' });
    const text = messages(d);
    expect(text).toContain('карточка «borscht» уже есть');
    expect(text).toContain('неизвестная серия «desserts»');
    expect(text).toContain('неизвестная позиция каталога «medovik»');
    expect(text).toContain('в серии «salads» нет карточек');
  });

  it('домашнее фото не совпадает по id с другой карточкой', () => {
    const d = deck();
    d.cards.push({ ...d.cards[0]!, id: 'borscht-home' });
    expect(messages(d)).toBe('');
    d.cards[0]!.homePhoto = d.cards[0]!.photo;
    expect(messages(d)).toContain('карточка «borscht-home» уже есть');
  });

  it('без файла — ошибка', () => {
    const { issues } = validateSources({ ...schemas, recipeFiles: [], planFiles: [], foodsFile: { file: 'data/foods.json', text: JSON.stringify(catalog) }, tasteDeckFile: null });
    expect(issues.map((i) => i.message)).toContain('Нет колоды анкеты');
  });
});
