import { ArrowRight, Clock, Flame, Leaf, Search, SlidersHorizontal, Snowflake, Users, X } from 'lucide-preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { Plate } from '../components/Plate.tsx';
import { Sheet } from '../components/Sheet.tsx';
import { StatBadge } from '../components/StatBadge.tsx';
import { plans, recipes } from '../data/index.ts';
import { countLabel, formatDuration } from '../lib/format.ts';
import { CATEGORIES, CATEGORY_ORDER, DIETS } from '../lib/labels.ts';
import { doneStepCount, isInProgress } from '../lib/plan.ts';
import { peekProgress } from '../lib/progress.ts';
import {
  applyFilters,
  extraFilterCount,
  FLAGS,
  filtersToQuery,
  isSeasonal,
  matchesExtras,
  parseFilters,
  SORTS,
  type RecipeFilters,
  type SortId,
} from '../lib/recipeFilters.ts';
import { Link, setQuery, useLocation } from '../lib/router.tsx';
import { buildIndex, search } from '../lib/search.ts';
import type { Diet, Recipe } from '../types/recipe.gen.ts';

const index = buildIndex(recipes);
const RECIPE_FORMS = ['рецепт', 'рецепта', 'рецептов'] as const;

export function RecipesPage() {
  const { query } = useLocation();
  const filters = parseFilters(query);
  const month = new Date().getMonth() + 1;
  const [sheetOpen, setSheetOpen] = useState(false);

  const update = (patch: Partial<RecipeFilters>) => setQuery(filtersToQuery({ ...filters, ...patch }));
  const reset = () => setQuery(filtersToQuery({ q: '', cat: null, flags: [], diets: [], tag: null, sort: filters.sort }));

  const results = useMemo(() => applyFilters(index, filters, month), [query.toString(), month]);

  // Счётчики на чипах категорий учитывают поиск и остальные фильтры.
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of search(index, filters.q)) {
      if (matchesExtras(r, filters, month)) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
    }
    return counts;
  }, [query.toString(), month]);

  const presentCategories = CATEGORY_ORDER.filter((c) => recipes.some((r) => r.category === c));
  const extras = extraFilterCount(filters);
  const anyFilter = extras > 0 || filters.q.trim() !== '' || filters.cat !== null;

  return (
    <div class="container page">
      <header class="page-head">
        <h1 class="display h1">
          Рецепты<span class="count num">{recipes.length}</span>
        </h1>
        <p class="lead">
          Домашняя кухня на каждый день и на неделю вперёд — с КБЖУ, сезонностью и тем, как хранить, замораживать и
          разогревать.
        </p>
      </header>

      <ActivePlanBanner />

      <div class="catalog">
        <aside class="catalog-side" aria-label="Фильтры">
          <FilterPanel filters={filters} update={update} month={month} />
        </aside>

        <div class="catalog-main">
          <SearchField value={filters.q} onChange={(q) => update({ q })} />

          <div class="chip-row catalog-cats" role="group" aria-label="Категории">
            <button class="chip" type="button" aria-pressed={filters.cat === null} onClick={() => update({ cat: null })}>
              Все
            </button>
            {presentCategories.map((c) => {
              const { plural, icon: Icon } = CATEGORIES[c];
              return (
                <button
                  key={c}
                  class="chip"
                  type="button"
                  aria-pressed={filters.cat === c}
                  onClick={() => update({ cat: filters.cat === c ? null : c })}
                >
                  <Icon />
                  {plural}
                  <span class="chip-count">{categoryCounts.get(c) ?? 0}</span>
                </button>
              );
            })}
          </div>

          <div class="catalog-bar">
            <p class="catalog-total" aria-live="polite">
              {results.length === recipes.length ? 'Все ' : 'Найдено: '}
              <strong class="num">{countLabel(results.length, RECIPE_FORMS)}</strong>
            </p>
            {anyFilter && (
              <button class="btn btn-ghost btn-sm" type="button" onClick={reset}>
                Сбросить
              </button>
            )}
            <button class="btn btn-outline btn-sm catalog-filter-btn" type="button" onClick={() => setSheetOpen(true)}>
              <SlidersHorizontal />
              Фильтры
              {extras > 0 && <span class="filter-count num">{extras}</span>}
            </button>
          </div>

          {(filters.tag || filters.flags.length > 0 || filters.diets.length > 0) && (
            <div class="chip-wrap active-filters">
              {filters.flags.map((id) => (
                <RemovablePill key={id} onRemove={() => update({ flags: filters.flags.filter((f) => f !== id) })}>
                  {FLAGS.find((f) => f.id === id)!.label(month)}
                </RemovablePill>
              ))}
              {filters.diets.map((d) => (
                <RemovablePill key={d} onRemove={() => update({ diets: filters.diets.filter((x) => x !== d) })}>
                  {DIETS[d]}
                </RemovablePill>
              ))}
              {filters.tag && <RemovablePill onRemove={() => update({ tag: null })}>#{filters.tag}</RemovablePill>}
            </div>
          )}

          {results.length > 0 ? (
            <ul class="recipe-grid">
              {results.map((r) => (
                <li key={r.id}>
                  <RecipeCard recipe={r} month={month} />
                </li>
              ))}
            </ul>
          ) : (
            <div class="empty">
              <span class="plate tone-saffron">
                <Search />
              </span>
              <p>
                Ничего не нашлось{filters.q.trim() ? ` по запросу «${filters.q.trim()}»` : ''}.
                <br />
                Попробуйте убрать часть фильтров.
              </p>
              <button class="btn btn-dark" type="button" onClick={reset}>
                Показать все рецепты
              </button>
            </div>
          )}
        </div>
      </div>

      {sheetOpen && (
        <Sheet
          title="Фильтры"
          onClose={() => setSheetOpen(false)}
          footer={
            <button class="btn btn-dark btn-lg btn-block" type="button" onClick={() => setSheetOpen(false)}>
              Показать {countLabel(results.length, RECIPE_FORMS)}
            </button>
          }
        >
          <FilterPanel filters={filters} update={update} month={month} />
        </Sheet>
      )}
    </div>
  );
}

function SearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // Локальное состояние + отложенная запись в URL: Safari ограничивает частоту history.replaceState.
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  useEffect(() => {
    if (text === value) return;
    const id = window.setTimeout(() => onChange(text), 200);
    return () => window.clearTimeout(id);
  }, [text]);

  return (
    <div class="search" role="search">
      <Search aria-hidden="true" />
      <input
        type="search"
        placeholder="Блюдо, продукт или тег"
        value={text}
        onInput={(e) => setText(e.currentTarget.value)}
        aria-label="Поиск рецептов"
        enterKeyHint="search"
        autoComplete="off"
      />
      {text && (
        <button
          class="icon-btn"
          type="button"
          onClick={() => {
            setText('');
            onChange('');
          }}
          aria-label="Очистить поиск"
        >
          <X />
        </button>
      )}
    </div>
  );
}

function FilterPanel(props: { filters: RecipeFilters; update: (p: Partial<RecipeFilters>) => void; month: number }) {
  const { filters, update, month } = props;
  const diets = (Object.keys(DIETS) as Diet[]).filter((d) => recipes.some((r) => r.diet?.includes(d)));
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of recipes) for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'));
  }, []);

  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  return (
    <div class="filter-panel">
      <fieldset class="filter-group">
        <legend class="eyebrow">Подборки</legend>
        <div class="chip-wrap">
          {FLAGS.map((f) => (
            <button
              key={f.id}
              class="chip"
              type="button"
              aria-pressed={filters.flags.includes(f.id)}
              onClick={() => update({ flags: toggle(filters.flags, f.id) })}
            >
              {f.id === 'quick' && <Clock />}
              {f.id === 'season' && <Leaf />}
              {f.id === 'freeze' && <Snowflake />}
              {f.id === 'light' && <Flame />}
              {f.label(month)}
            </button>
          ))}
        </div>
      </fieldset>

      {diets.length > 0 && (
        <fieldset class="filter-group">
          <legend class="eyebrow">Питание</legend>
          <div class="chip-wrap">
            {diets.map((d) => (
              <button
                key={d}
                class="chip"
                type="button"
                aria-pressed={filters.diets.includes(d)}
                onClick={() => update({ diets: toggle(filters.diets, d) })}
              >
                {DIETS[d]}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset class="filter-group">
        <legend class="eyebrow">Теги</legend>
        <div class="chip-wrap">
          {tags.map(([t, n]) => (
            <button
              key={t}
              class="chip"
              type="button"
              aria-pressed={filters.tag === t}
              onClick={() => update({ tag: filters.tag === t ? null : t })}
            >
              {t}
              <span class="chip-count">{n}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset class="filter-group">
        <legend class="eyebrow">Сортировка</legend>
        <div class="chip-wrap">
          {(Object.keys(SORTS) as SortId[]).map((s) => (
            <button key={s} class="chip" type="button" aria-pressed={filters.sort === s} onClick={() => update({ sort: s })}>
              {SORTS[s]}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

function RemovablePill({ children, onRemove }: { children: preact.ComponentChildren; onRemove: () => void }) {
  return (
    <button class="chip active-pill" type="button" onClick={onRemove} aria-label="Убрать фильтр">
      {children}
      <X />
    </button>
  );
}

export function RecipeCard({ recipe: r, month }: { recipe: Recipe; month: number }) {
  const category = CATEGORIES[r.category];
  return (
    <Link to={`/recipes/${r.id}/`} class="recipe-card">
      <Plate recipe={r} size={60} />
      <div class="recipe-card-body">
        <span class="recipe-card-eyebrow">
          {category.label}
          {r.cuisine && ` · ${r.cuisine}`}
        </span>
        <h2 class="display recipe-card-title">{r.title}</h2>
        <p class="recipe-card-desc">{r.description}</p>
        <div class="meta">
          <span>
            <Clock aria-hidden="true" />
            {formatDuration(r.time.total)}
          </span>
          <span>
            <Users aria-hidden="true" />
            {r.servings.count}
          </span>
          <span>
            <Flame aria-hidden="true" />
            {r.nutrition.kcal}&nbsp;ккал
          </span>
          {r.freezing.suitable && (
            <span class="meta-icon" title="Можно заморозить">
              <Snowflake aria-label="Можно заморозить" />
            </span>
          )}
          {isSeasonal(r, month) && (
            <span class="meta-icon is-season" title="Сейчас сезон">
              <Leaf aria-label="Сейчас сезон" />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/** Если какую-то техкарту начали готовить и не закончили — быстрый возврат к ней. */
function ActivePlanBanner() {
  const plan = plans.find((p) => isInProgress(p, peekProgress(p.id)));
  if (!plan) return null;
  const done = doneStepCount(plan, peekProgress(plan.id));
  return (
    <Link to={`/plans/${plan.id}/?tab=steps`} class="next-plan">
      <StatBadge top="шаг" value={String(Math.min(done + 1, plan.steps.length))} bottom={`из ${plan.steps.length}`} />
      <span class="next-plan-body">
        <span class="eyebrow">Готовка в процессе</span>
        <span class="display next-plan-title">{plan.title}</span>
        <span class="next-plan-meta">
          выполнено {done} из {plan.steps.length} · всего {formatDuration(plan.duration.total)}
        </span>
      </span>
      <ArrowRight class="next-plan-arrow" aria-hidden="true" />
    </Link>
  );
}
