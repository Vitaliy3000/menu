import { ExternalLink, Search, SlidersHorizontal, X } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { SearchField } from '../components/SearchField.tsx';
import { Sheet } from '../components/Sheet.tsx';
import { loadFoods } from '../data/index.ts';
import { AROMA_NOTES, CUISINES, ranked, TASTES, type Level } from '../lib/flavor.ts';
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
  SCALES,
  type FoodEntry,
  type FoodFilters,
  type FoodScale,
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
  const reset = () => setQuery(foodFiltersToQuery({ q: '', group: null, min: 0, sort: filters.sort, scale: 'freeze' }));

  const results = filterFoods(index, filters);
  const groupCounts = new Map<string, number>();
  for (const e of matchAllGroups(index, filters)) groupCounts.set(e.group.id, (groupCounts.get(e.group.id) ?? 0) + 1);
  const otherScale = filters.scale !== 'freeze';
  const scoreFilters = Number(otherScale) + Number(filters.min > 0);
  const anyFilter = filters.q.trim() !== '' || filters.group !== null || scoreFilters > 0;
  const panel = <FoodsPanel entries={matchAllScores(index, filters)} filters={filters} update={update} />;

  return (
    <div class="container page foods">
      <header class="page-head">
        <h1 class="display h1">
          Продукты и блюда<span class="count num">{index.length}</span>
        </h1>
        <p class="lead">
          Продукты, части блюд, блюда и соусы: вкус и аромат по шкале от 0 до 10, кухни, к которым они относятся, и
          как они переносят домашнюю заморозку и микроволновку. Оценки от 0 до 100: заморозка — насколько после
          разморозки и лучшего способа восстановления это похоже на свежее, микроволновка — насколько после нагрева это
          похоже на только что приготовленное. Сырое и готовое — отдельными позициями.
        </p>
      </header>

      <div class="catalog">
        <aside class="catalog-side" aria-label="Оценка и сортировка">
          {panel}
        </aside>

        <div class="catalog-main">
          <SearchField value={filters.q} onChange={(q) => update({ q })} placeholder="Продукт, блюдо или кухня" label="Поиск по каталогу" />

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
              {scoreFilters > 0 && <span class="filter-count num">{scoreFilters}</span>}
            </button>
          </div>

          {scoreFilters > 0 && (
            <div class="chip-wrap active-filters">
              {otherScale && (
                <button class="chip active-pill" type="button" onClick={() => update({ scale: 'freeze' })} aria-label="Вернуть шкалу заморозки">
                  {SCALES[filters.scale].label}
                  <X />
                </button>
              )}
              {filters.min > 0 && (
                <button class="chip active-pill" type="button" onClick={() => update({ min: 0 })} aria-label="Убрать фильтр">
                  {filters.min}+ · {bandOf(filters.min, filters.scale).label.toLowerCase()}
                  {filters.min < 95 && ' и лучше'}
                  <X />
                </button>
              )}
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
                <FoodList entries={entries} scale={filters.scale} sources={sources} />
              </section>
            ))
          ) : (
            <FoodList entries={results} scale={filters.scale} sources={sources} showGroup />
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

/** Выбор шкалы и распределение оценок по ней; полоса — порог «не ниже». */
function FoodsPanel(props: { entries: FoodEntry[]; filters: FoodFilters; update: (p: Partial<FoodFilters>) => void }) {
  const { entries, filters, update } = props;
  const counts = bandCounts(entries, filters.scale);
  const max = Math.max(1, ...counts.map((c) => c.count));

  return (
    <div class="filter-panel">
      <fieldset class="filter-group">
        <legend class="eyebrow">Шкала</legend>
        <div class="chip-wrap">
          {(Object.keys(SCALES) as FoodScale[]).map((s) => (
            <button key={s} class="chip" type="button" aria-pressed={filters.scale === s} onClick={() => update({ scale: s })}>
              {SCALES[s].label}
            </button>
          ))}
        </div>
      </fieldset>

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

function FoodList(props: { entries: FoodEntry[]; scale: FoodScale; sources: Map<string, FoodSource>; showGroup?: boolean }) {
  return (
    <ul class="food-list">
      {props.entries.map((e) => (
        <li key={e.food.id}>
          <FoodRow food={e.food} group={props.showGroup ? e.group.title : null} scale={props.scale} sources={props.sources} />
        </li>
      ))}
    </ul>
  );
}

/** Полоса шкалы, у заморозки — и срок. */
function scoreSummary(f: Food, scale: FoodScale): string {
  const months = scale === 'freeze' && f.months ? ` · до ${f.months} мес.` : '';
  return bandOf(SCALES[scale].score(f), scale).label + months;
}

function FoodRow(props: { food: Food; group: string | null; scale: FoodScale; sources: Map<string, FoodSource> }) {
  const { food: f, group, scale, sources } = props;
  const [open, setOpen] = useState(false);
  const score = SCALES[scale].score(f);
  return (
    <details class="food-row" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        <span class="food-score" aria-label={`${SCALES[scale].label}: ${score} из 100`}>
          <span class="food-score-value num">{score}</span>
          <span class="food-score-track" aria-hidden="true">
            <span class="food-score-bar" style={{ width: `${score}%` }} />
          </span>
        </span>
        <span class="food-row-body">
          <span class="food-name">{f.name}</span>
          <span class="faint food-meta">
            {group && `${group} · `}
            {scoreSummary(f, scale)}
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
      <dt>Вкус</dt>
      <dd>
        <Levels levels={ranked(f.taste, TASTES)} />
      </dd>
      {f.aroma && (
        <>
          <dt>Аромат</dt>
          <dd>
            <Levels levels={ranked(f.aroma, AROMA_NOTES)} />
          </dd>
        </>
      )}
      {f.cuisines && (
        <>
          <dt>Кухни</dt>
          <dd>{f.cuisines.map((c) => CUISINES[c]).join(', ')}</dd>
        </>
      )}
      <dt>Микроволновка</dt>
      <dd>
        <span class="num">{f.microwaveScore}</span> · {scoreSummary(f, 'microwave')}
      </dd>
      <dt>Заморозка</dt>
      <dd>
        <span class="num">{f.freezeScore}</span> · {scoreSummary(f, 'freeze')}
      </dd>
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
      <dt>Источники заморозки</dt>
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

function Levels({ levels }: { levels: Level[] }) {
  if (levels.length === 0) return <span class="faint">нейтральный</span>;
  return (
    <span class="food-levels">
      {levels.map((l) => (
        <span key={l.label}>
          {l.label} <span class="num">{l.value}</span>
        </span>
      ))}
    </span>
  );
}
