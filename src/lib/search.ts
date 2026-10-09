/** Поиск по рецептам: без учёта регистра и «ё», все слова запроса должны найтись. */
import type { Recipe } from '../types/recipe.gen.ts';
import { CATEGORIES, DIETS } from './labels.ts';

export function normalize(s: string): string {
  return s.toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export interface SearchIndexEntry {
  recipe: Recipe;
  title: string;
  text: string;
}

export function buildIndex(recipes: Recipe[]): SearchIndexEntry[] {
  return recipes.map((recipe) => ({
    recipe,
    title: normalize(recipe.title),
    text: normalize(
      [
        recipe.title,
        recipe.description,
        recipe.cuisine ?? '',
        CATEGORIES[recipe.category].label,
        ...recipe.tags,
        ...(recipe.diet ?? []).map((d) => DIETS[d]),
        ...recipe.ingredients.flatMap((g) => g.items.map((i) => i.name)),
      ].join(' '),
    ),
  }));
}

/** Возвращает рецепты, подходящие под запрос; совпадения в названии — выше. */
export function search(index: SearchIndexEntry[], query: string): Recipe[] {
  const words = normalize(query).split(' ').filter(Boolean);
  if (words.length === 0) return index.map((e) => e.recipe);
  return index
    .filter((e) => words.every((w) => e.text.includes(w)))
    .map((e) => ({ e, score: words.filter((w) => e.title.includes(w)).length }))
    .sort((a, b) => b.score - a.score)
    .map(({ e }) => e.recipe);
}
