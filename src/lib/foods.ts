/** Каталог продуктов: шкалы заморозки и микроволновки, поиск и фильтры. Состояние фильтров живёт в query-параметрах URL. */
import type { Food, FoodGroup, Foods } from '../types/foods.gen.ts';
import { CUISINES } from './flavor.ts';
import { normalize } from './search.ts';

export interface ScoreBand {
  min: number;
  max: number;
  label: string;
  hint: string;
}

export type FoodScale = 'freeze' | 'microwave';

export interface Scale {
  label: string;
  score: (f: Food) => number;
  /** От лучшей к худшей — те же границы, что в описании оценки в schemas/foods.schema.json. */
  bands: ScoreBand[];
}

export const SCALES: Record<FoodScale, Scale> = {
  freeze: {
    label: 'Заморозка',
    score: (f) => f.freezeScore,
    bands: [
      { min: 95, max: 100, label: 'Не отличить', hint: 'даже рядом со свежим' },
      { min: 85, max: 90, label: 'Почти без потерь', hint: 'разница видна только рядом или снимается простым приёмом' },
      { min: 70, max: 80, label: 'Хорошо', hint: 'заметно, но в обычном виде хорошо' },
      { min: 50, max: 65, label: 'С потерями', hint: 'хорошо после восстановления или в другом применении' },
      { min: 30, max: 45, label: 'Только в готовку', hint: 'годится как ингредиент в горячее' },
      { min: 10, max: 25, label: 'Плохо', hint: 'теряет смысл, спасти почти нечем' },
      { min: 0, max: 5, label: 'Не замораживать', hint: 'испортится или бессмысленно' },
    ],
  },
  microwave: {
    label: 'Микроволновка',
    score: (f) => f.microwaveScore,
    bands: [
      { min: 95, max: 100, label: 'Не отличить', hint: 'от свежеприготовленного, можно подать в хорошем ресторане' },
      { min: 85, max: 90, label: 'Почти без потерь', hint: 'разница видна только рядом или снимается простым приёмом' },
      { min: 70, max: 80, label: 'Хорошо', hint: 'заметно, но вкусно' },
      { min: 50, max: 65, label: 'С потерями', hint: 'подсыхает, плотнеет, корка размякает' },
      { min: 30, max: 45, label: 'Только поесть', hint: 'съедобно, но не подать' },
      { min: 10, max: 25, label: 'Плохо', hint: 'теряет смысл' },
      { min: 0, max: 5, label: 'Не греть', hint: 'после нагрева есть нельзя' },
    ],
  },
};

export const bandOf = (score: number, scale: FoodScale): ScoreBand => SCALES[scale].bands.find((b) => score >= b.min)!;

export type FoodSort = 'shelf' | 'best' | 'worst';

export const FOOD_SORTS: Record<FoodSort, string> = {
  shelf: 'По группам',
  best: 'Сначала лучшие',
  worst: 'Сначала худшие',
};

export interface FoodFilters {
  q: string;
  group: string | null;
  min: number;
  sort: FoodSort;
  scale: FoodScale;
}

export interface FoodEntry {
  food: Food;
  group: FoodGroup;
  text: string;
}

export function indexFoods(foods: Foods): FoodEntry[] {
  return foods.groups.flatMap((group) =>
    group.items.map((food) => {
      const cuisines = food.cuisines?.map((c) => CUISINES[c]).join(' ') ?? '';
      return { food, group, text: normalize(`${food.name} ${group.title} ${cuisines}`) };
    }),
  );
}

export function parseFoodFilters(query: URLSearchParams, groups: FoodGroup[]): FoodFilters {
  const group = query.get('group');
  const min = Number(query.get('min'));
  const sort = query.get('sort');
  const scaleParam = query.get('scale');
  const scale = scaleParam && scaleParam in SCALES ? (scaleParam as FoodScale) : 'freeze';
  return {
    q: query.get('q') ?? '',
    group: groups.some((g) => g.id === group) ? group : null,
    min: SCALES[scale].bands.some((b) => b.min === min) ? min : 0,
    sort: sort && sort in FOOD_SORTS ? (sort as FoodSort) : 'shelf',
    scale,
  };
}

export function foodFiltersToQuery(f: FoodFilters): Record<string, string | null> {
  return {
    q: f.q.trim() || null,
    group: f.group,
    min: f.min ? String(f.min) : null,
    sort: f.sort === 'shelf' ? null : f.sort,
    scale: f.scale === 'freeze' ? null : f.scale,
  };
}

const matchesQuery = (e: FoodEntry, words: string[]) => words.every((w) => e.text.includes(w));
const scoreOf = (e: FoodEntry, scale: FoodScale) => SCALES[scale].score(e.food);
const queryWords = (q: string) => normalize(q).split(' ').filter(Boolean);

/** Без учёта группы — по ним считаются чипы групп. */
export function matchAllGroups(index: FoodEntry[], f: FoodFilters): FoodEntry[] {
  const words = queryWords(f.q);
  return index.filter((e) => scoreOf(e, f.scale) >= f.min && matchesQuery(e, words));
}

/** Без учёта порога — по ним считается распределение оценок. */
export function matchAllScores(index: FoodEntry[], f: FoodFilters): FoodEntry[] {
  const words = queryWords(f.q);
  return index.filter((e) => (!f.group || e.group.id === f.group) && matchesQuery(e, words));
}

export function filterFoods(index: FoodEntry[], f: FoodFilters): FoodEntry[] {
  const found = matchAllScores(index, f).filter((e) => scoreOf(e, f.scale) >= f.min);
  const by: Record<FoodSort, (a: FoodEntry, b: FoodEntry) => number> = {
    shelf: () => 0,
    best: (a, b) => scoreOf(b, f.scale) - scoreOf(a, f.scale),
    worst: (a, b) => scoreOf(a, f.scale) - scoreOf(b, f.scale),
  };
  return [...found].sort(by[f.sort]);
}

/** Сколько позиций в каждой полосе шкалы — в порядке её полос. */
export function bandCounts(entries: FoodEntry[], scale: FoodScale): { band: ScoreBand; count: number }[] {
  return SCALES[scale].bands.map((band) => ({ band, count: entries.filter((e) => bandOf(scoreOf(e, scale), scale) === band).length }));
}

/** Результаты по группам в порядке каталога. */
export function byGroup(entries: FoodEntry[]): { group: FoodGroup; entries: FoodEntry[] }[] {
  const groups = new Map<FoodGroup, FoodEntry[]>();
  for (const e of entries) {
    const list = groups.get(e.group);
    if (list) list.push(e);
    else groups.set(e.group, [e]);
  }
  return [...groups].map(([group, list]) => ({ group, entries: list }));
}
