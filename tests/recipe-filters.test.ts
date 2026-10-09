import { describe, expect, it } from 'vitest';
import { applyFilters, filtersToQuery, parseFilters } from '../src/lib/recipeFilters.ts';
import { buildIndex } from '../src/lib/search.ts';
import type { Recipe } from '../src/types/recipe.gen.ts';

const recipe = (id: string, patch: Partial<Recipe>): Recipe =>
  ({
    id,
    title: id,
    description: '',
    category: 'main',
    tags: [],
    difficulty: 'easy',
    servings: { count: 2 },
    time: { active: 10, total: 20 },
    nutrition: { kcal: 300, protein: 10, fat: 10, carbs: 40 },
    ingredients: [{ items: [{ name: 'Соль' }] }],
    steps: [{ steps: [{ text: 'Готовить' }] }],
    seasonality: { months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
    storage: {},
    freezing: { suitable: false, note: 'нет' },
    reheating: { methods: [] },
    ...patch,
  }) as Recipe;

const recipes = [
  recipe('Борщ', { category: 'soup', time: { active: 60, total: 180 }, freezing: { suitable: true, months: 3, how: 'так', thawing: 'так' }, ingredients: [{ items: [{ name: 'Свёкла' }] }] }),
  recipe('Тыквенный суп', { category: 'soup', seasonality: { months: [9, 10, 11] }, diet: ['vegan'], tags: ['осень'] }),
  recipe('Шакшука', { category: 'breakfast', diet: ['vegetarian'], nutrition: { kcal: 450, protein: 22, fat: 31, carbs: 21 } }),
];
const index = buildIndex(recipes);
const ids = (rs: Recipe[]) => rs.map((r) => r.id);
const filters = (qs: string) => parseFilters(new URLSearchParams(qs));

describe('фильтры каталога', () => {
  it('поиск без учёта «ё» и по ингредиентам', () => {
    expect(ids(applyFilters(index, filters('q=свекла'), 10))).toEqual(['Борщ']);
    // Совпадение в названии — выше, совпадение по категории «суп» — ниже.
    expect(ids(applyFilters(index, filters('q=СУП'), 10))).toEqual(['Тыквенный суп', 'Борщ']);
  });

  it('категория, сезон, заморозка и диета', () => {
    expect(ids(applyFilters(index, filters('cat=soup'), 10))).toEqual(['Борщ', 'Тыквенный суп']);
    expect(ids(applyFilters(index, filters('f=season'), 10))).toEqual(['Тыквенный суп']);
    expect(ids(applyFilters(index, filters('f=season'), 5))).toEqual([]);
    expect(ids(applyFilters(index, filters('f=freeze'), 10))).toEqual(['Борщ']);
    // Веганское — тоже вегетарианское.
    expect(ids(applyFilters(index, filters('diet=vegetarian'), 10))).toEqual(['Тыквенный суп', 'Шакшука']);
  });

  it('сортировка по времени', () => {
    expect(ids(applyFilters(index, filters('sort=time'), 10))[2]).toBe('Борщ');
  });

  it('URL ↔ состояние фильтров', () => {
    const f = filters('q=суп&cat=soup&f=quick,bogus&diet=vegan&tag=осень&sort=kcal');
    expect(f.flags).toEqual(['quick']);
    expect(filtersToQuery(f)).toEqual({ q: 'суп', cat: 'soup', f: 'quick', diet: 'vegan', tag: 'осень', sort: 'kcal' });
    expect(filters('cat=nope').cat).toBeNull();
  });
});
