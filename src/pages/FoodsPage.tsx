import { ExternalLink, Search, SlidersHorizontal, X } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { SearchField } from '../components/SearchField.tsx';
import { Sheet } from '../components/Sheet.tsx';
import { loadFoods } from '../data/index.ts';
import { countLabel } from '../lib/format.ts';
import {
  bandCounts,
  bandOf,
  byGroup,
  filterFoods,
  FOOD_SORTS,
  foodFiltersToQuery,
  indexFoods,
  matchAllGroups,
  matchAllScores,
  parseFoodFilters,
  type FoodEntry,
  type FoodFilters,
  type FoodSort,
} from '../lib/foods.ts';
import { setQuery, useLocation } from '../lib/router.tsx';
import type { Food, FoodSource, Foods } from '../types/foods.gen.ts';

const FOOD_FORMS = ['позиция', 'позиции', 'позиций'] as const;

export function FoodsPage() {
  const [foods, setFoods] = useState<Foods | null>(null);
  useEffect(() => void loadFoods().then(setFoods), []);
  return foods ? <FoodsCatalog foods={foods} /> : <div class="container page" aria-busy="true" />;
}

function FoodsCatalog({ foods }: { foods: Foods }) {
  const [index] = useState(() => indexFoods(foods));
  const [sources] = useState(() => new Map(foods.sources.map((s) => [s.id, s])));
  const [sheetOpen, setSheetOpen] = useState(false);
  const { query } = useLocation();
  const filters = parseFoodFilters(query, foods.groups);

  const update = (patch: Partial<FoodFilters>) => setQuery(foodFiltersToQuery({ ...filters, ...patch }));
  const reset = () => setQuery(foodFiltersToQuery({ q: '', group: null, min: 0, sort: filters.sort }));

  const results = filterFoods(index, filters);
  const groupCounts = new Map<string, number>();
  for (const e of matchAllGroups(index, filters)) groupCounts.set(e.group.id, (groupCounts.get(e.group.id) ?? 0) + 1);
  const anyFilter = filters.q.trim() !== '' || filters.group !== null || filters.min > 0;
  const panel = <FoodsPanel entries={matchAllScores(index, filters)} filters={filters} update={update} />;

  return (
    <div class="container page foods">
      <header class="page-head">
        <h1 class="display h1">
          Продукты и блюда<span class="count num">{index.length}</span>
        </h1>
        <p class="lead">
          Как продукты, части блюд, блюда и соусы переносят домашнюю заморозку. Оценка от 0 до 100 — насколько после
          разморозки и лучшего способа восстановления это похоже на свежее. Сырое и готовое — отдельными позициями.
        </p>
      </header>

      <div class="catalog">
        <aside class="catalog-side" aria-label="Оценка и сортировка">
          {panel}
        </aside>

        <div class="catalog-main">
          <SearchField value={filters.q} onChange={(q) => update({ q })} placeholder="Продукт или блюдо" label="Поиск по каталогу" />

          <div class="chip-row" role="group" aria-label="Группы">
            <button class="chip" type="button" aria-pressed={filters.group === null} onClick={() => update({ group: null })}>
              Все
            </button>
            {foods.groups.map((g) => (
              <button
                key={g.id}
                class="chip"
                type="button"
                aria-pressed={filters.group === g.id}
                onClick={() => update({ group: filters.group === g.id ? null : g.id })}
              >
                {g.title}
                <span class="chip-count">{groupCounts.get(g.id) ?? 0}</span>
              </button>
            ))}
          </div>

          <div class="catalog-bar">
            <p class="catalog-total" aria-live="polite">
              {results.length === index.length ? 'Все ' : 'Найдено: '}
              <strong class="num">{countLabel(results.length, FOOD_FORMS)}</strong>
            </p>
            {anyFilter && (
              <button class="btn btn-ghost btn-sm" type="button" onClick={reset}>
                Сбросить
              </button>
            )}
            <button class="btn btn-outline btn-sm catalog-filter-btn" type="button" onClick={() => setSheetOpen(true)}>
              <SlidersHorizontal />
              Оценка
              {filters.min > 0 && <span class="filter-count num">1</span>}
            </button>
          </div>

          {filters.min > 0 && (
            <div class="chip-wrap active-filters">
              <button class="chip active-pill" type="button" onClick={() => update({ min: 0 })} aria-label="Убрать фильтр">
                {filters.min}+ · {bandOf(filters.min).label.toLowerCase()}
                {filters.min < 95 && ' и лучше'}
                <X />
              </button>
            </div>
          )}

          {results.length === 0 ? (
            <div class="empty">
              <span class="plate tone-sky">
                <Search />
              </span>
              <p>
                Ничего не нашлось{filters.q.trim() ? ` по запросу «${filters.q.trim()}»` : ''}.
                <br />
                Попробуйте убрать часть фильтров.
              </p>
              <button class="btn btn-dark" type="button" onClick={reset}>
                Показать всё
              </button>
            </div>
          ) : filters.sort === 'shelf' ? (
            byGroup(results).map(({ group, entries }) => (
              <section key={group.id} class="food-group">
                <h2 class="display h3 food-group-title">
                  {group.title}
                  <span class="count num">{entries.length}</span>
                </h2>
                <FoodList entries={entries} sources={sources} />
              </section>
            ))
          ) : (
            <FoodList entries={results} sources={sources} showGroup />
          )}
        </div>
      </div>

      {sheetOpen && (
        <Sheet
          title="Оценка"
          onClose={() => setSheetOpen(false)}
          footer={
            <button class="btn btn-dark btn-lg btn-block" type="button" onClick={() => setSheetOpen(false)}>
              Показать {countLabel(results.length, FOOD_FORMS)}
            </button>
          }
        >
          {panel}
        </Sheet>
      )}
    </div>
  );
}

/** Распределение оценок по шкале; полоса — порог «не ниже». */
function FoodsPanel(props: { entries: FoodEntry[]; filters: FoodFilters; update: (p: Partial<FoodFilters>) => void }) {
  const { entries, filters, update } = props;
  const counts = bandCounts(entries);
  const max = Math.max(1, ...counts.map((c) => c.count));

  return (
    <div class="filter-panel">
      <fieldset class="filter-group">
        <legend class="eyebrow">Не ниже</legend>
        <ul class="score-scale">
          {counts.map(({ band, count }) => (
            <li key={band.min}>
              <button
                class={`score-band${filters.min > 0 && band.min < filters.min ? ' is-below' : ''}`}
                type="button"
                aria-pressed={filters.min > 0 && filters.min === band.min}
                onClick={() => update({ min: filters.min === band.min ? 0 : band.min })}
              >
                <span class="score-band-head">
                  <span class="score-band-label">{band.label}</span>
                  <span class="faint num">
                    {band.min}–{band.max}
                  </span>
                  <span class="score-band-count num">{count}</span>
                </span>
                <span class="score-band-track" aria-hidden="true">
                  <span class="score-band-bar" style={{ width: `${(count / max) * 100}%` }} />
                </span>
                <span class="faint score-band-hint">{band.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset class="filter-group">
        <legend class="eyebrow">Сортировка</legend>
        <div class="chip-wrap">
          {(Object.keys(FOOD_SORTS) as FoodSort[]).map((s) => (
            <button key={s} class="chip" type="button" aria-pressed={filters.sort === s} onClick={() => update({ sort: s })}>
              {FOOD_SORTS[s]}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

function FoodList(props: { entries: FoodEntry[]; sources: Map<string, FoodSource>; showGroup?: boolean }) {
  return (
    <ul class="food-list">
      {props.entries.map((e) => (
        <li key={e.food.id}>
          <FoodRow food={e.food} group={props.showGroup ? e.group.title : null} sources={props.sources} />
        </li>
      ))}
    </ul>
  );
}

function FoodRow({ food: f, group, sources }: { food: Food; group: string | null; sources: Map<string, FoodSource> }) {
  const [open, setOpen] = useState(false);
  return (
    <details class="food-row" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        <span class="food-score" aria-label={`Оценка ${f.freezeScore} из 100`}>
          <span class="food-score-value num">{f.freezeScore}</span>
          <span class="food-score-track" aria-hidden="true">
            <span class="food-score-bar" style={{ width: `${f.freezeScore}%` }} />
          </span>
        </span>
        <span class="food-row-body">
          <span class="food-name">{f.name}</span>
          <span class="faint food-meta">
            {group && `${group} · `}
            {bandOf(f.freezeScore).label}
            {f.months ? ` · до ${f.months} мес.` : ''}
          </span>
        </span>
      </summary>
      {open && <FoodDetails food={f} sources={sources} />}
    </details>
  );
}

function FoodDetails({ food: f, sources }: { food: Food; sources: Map<string, FoodSource> }) {
  return (
    <dl class="food-details">
      <dt>Что теряет</dt>
      <dd>{f.losses}</dd>
      {f.recovery && (
        <>
          <dt>Как вернуть</dt>
          <dd>{f.recovery}</dd>
        </>
      )}
      {f.method && (
        <>
          <dt>Как заморозить</dt>
          <dd>{f.method}</dd>
        </>
      )}
      <dt>Источники</dt>
      <dd>
        {f.sources ? (
          <span class="food-sources">
            {f.sources.map((id) => {
              const s = sources.get(id)!;
              return (
                <a key={id} href={s.url} target="_blank" rel="noreferrer">
                  {s.title}
                  <ExternalLink aria-hidden="true" />
                </a>
              );
            })}
          </span>
        ) : (
          <span class="faint">Оценка по аналогии с похожими продуктами</span>
        )}
      </dd>
    </dl>
  );
}
