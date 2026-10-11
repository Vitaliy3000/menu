import {
  Archive,
  Check,
  ChefHat,
  ChevronLeft,
  Clock,
  Flame,
  Leaf,
  Lightbulb,
  Minus,
  Plus,
  Refrigerator,
  Snowflake,
  Sun,
  Users,
} from 'lucide-preact';
import { useState } from 'preact/hooks';
import { MacroBar } from '../components/MacroBar.tsx';
import { MonthStrip } from '../components/MonthStrip.tsx';
import { Plate } from '../components/Plate.tsx';
import { SectionNav } from '../components/SectionNav.tsx';
import { Steps } from '../components/Steps.tsx';
import { WakeLockToggle } from '../components/WakeLockToggle.tsx';
import { countLabel, formatAmount, formatDuration, formatNumber, MONTHS_IN, roundAmount } from '../lib/format.ts';
import { CATEGORIES, DIETS, DIFFICULTY, REHEAT } from '../lib/labels.ts';
import { isSeasonal } from '../lib/recipeFilters.ts';
import { Link } from '../lib/router.tsx';
import type { Ingredient, Recipe } from '../types/recipe.gen.ts';

const PORTIONS = ['порция', 'порции', 'порций'] as const;

export function RecipePage({ recipe: r }: { recipe: Recipe }) {
  const [servings, setServings] = useState(r.servings.count);
  const factor = servings / r.servings.count;
  const category = CATEGORIES[r.category];
  const month = new Date().getMonth() + 1;

  return (
    <article class="container page recipe">
      <Link to="/" class="back-link">
        <ChevronLeft aria-hidden="true" />
        Рецепты
      </Link>

      <header class="recipe-hero">
        <div class="recipe-hero-text">
          <p class="eyebrow">
            {category.label}
            {r.cuisine && ` · ${r.cuisine} кухня`}
          </p>
          <h1 class="display h1">{r.title}</h1>
          <p class="lead">{r.description}</p>
          <div class="chip-wrap recipe-tags">
            {isSeasonal(r, month) && (
              <span class="badge badge-done">
                <Leaf aria-hidden="true" />
                Сейчас сезон
              </span>
            )}
            {r.freezing.suitable && (
              <span class="badge badge-info">
                <Snowflake aria-hidden="true" />
                Можно заморозить
              </span>
            )}
            {r.diet?.map((d) => (
              <span key={d} class="badge">
                {DIETS[d]}
              </span>
            ))}
            {r.tags.map((t) => (
              <Link key={t} to={`/?tag=${encodeURIComponent(t)}`} class="tag">
                #{t}
              </Link>
            ))}
          </div>
        </div>
        <div class="recipe-hero-plate" aria-hidden="true">
          <Plate recipe={r} size={168} />
        </div>
      </header>

      <dl class="facts">
        <div class="fact">
          <dt>
            <Clock aria-hidden="true" />
            Время
          </dt>
          <dd class="display num">{formatDuration(r.time.total)}</dd>
          <dd class="fact-sub">
            активно {formatDuration(r.time.active)}
            {r.time.note && <> · {r.time.note}</>}
          </dd>
        </div>
        <div class="fact">
          <dt>
            <Users aria-hidden="true" />
            Порции
          </dt>
          <dd class="display num">{r.servings.count}</dd>
          {r.servings.yield && <dd class="fact-sub">{r.servings.yield}</dd>}
        </div>
        <div class="fact">
          <dt>
            <ChefHat aria-hidden="true" />
            Сложность
          </dt>
          <dd class="display">{DIFFICULTY[r.difficulty]}</dd>
          <dd class="fact-sub">{countLabel(r.steps.reduce((n, g) => n + g.steps.length, 0), ['шаг', 'шага', 'шагов'])}</dd>
        </div>
        <div class="fact">
          <dt>
            <Flame aria-hidden="true" />
            Порция
          </dt>
          <dd class="display num">{r.nutrition.kcal} ккал</dd>
          <dd class="fact-sub num">
            Б {formatNumber(r.nutrition.protein)} · Ж {formatNumber(r.nutrition.fat)} · У {formatNumber(r.nutrition.carbs)}
          </dd>
        </div>
      </dl>

      <SectionNav
        label="Разделы рецепта"
        sections={[
          { id: 'ingredients', label: 'Ингредиенты' },
          { id: 'method', label: 'Приготовление' },
          ...(r.tips && r.tips.length > 0 ? [{ id: 'tips', label: 'Советы' }] : []),
          { id: 'storage', label: 'Хранение' },
        ]}
      />

      <div class="recipe-body">
        <aside class="recipe-aside">
          <section id="ingredients" class="card card-pad ingredients">
            <div class="ingredients-head">
              <h2 class="display h3">Ингредиенты</h2>
              <div class="stepper" role="group" aria-label="Количество порций">
                <button type="button" onClick={() => setServings((s) => Math.max(1, s - 1))} aria-label="Меньше порций" disabled={servings <= 1}>
                  <Minus />
                </button>
                <span class="num" aria-live="polite">
                  {countLabel(servings, PORTIONS)}
                </span>
                <button type="button" onClick={() => setServings((s) => Math.min(99, s + 1))} aria-label="Больше порций">
                  <Plus />
                </button>
              </div>
            </div>
            {factor !== 1 && (
              <p class="scaled-note">
                Количества пересчитаны ×{formatNumber(Math.round(factor * 100) / 100)} и округлены.{' '}
                <button type="button" class="link-btn" onClick={() => setServings(r.servings.count)}>
                  Вернуть {r.servings.count}
                </button>
              </p>
            )}
            {r.ingredients.map((group, gi) => (
              <div key={gi} class="ingredient-group">
                {group.title && <h3 class="eyebrow">{group.title}</h3>}
                <ul>
                  {group.items.map((item, ii) => (
                    <IngredientRow key={`${gi}-${ii}`} item={item} factor={factor} />
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </aside>

        <section id="method" class="method">
          <div class="method-head">
            <h2 class="display h2">Приготовление</h2>
            <WakeLockToggle />
          </div>
          {r.equipment && r.equipment.length > 0 && (
            <p class="equipment-line">
              <span class="eyebrow">Понадобится</span>
              {r.equipment.join(' · ')}
            </p>
          )}
          <RecipeSteps recipe={r} />
        </section>
      </div>

      {r.tips && r.tips.length > 0 && (
        <section id="tips" class="section">
          <h2 class="display h2 section-heading">Советы</h2>
          <ul class="tips">
            {r.tips.map((tip, i) => (
              <li key={i}>
                <Lightbulb aria-hidden="true" />
                <p>{tip}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section id="storage" class="section">
        <h2 class="display h2 section-heading">Хранение и подача</h2>
        <div class="info-grid">
          <div class="card card-pad info-card">
            <h3 class="info-title">
              <Flame aria-hidden="true" />
              Пищевая ценность
            </h3>
            <p class="info-big display num">
              {r.nutrition.kcal} <span>ккал на порцию</span>
            </p>
            <MacroBar n={r.nutrition} />
            {r.nutrition.fiber !== undefined && (
              <p class="faint info-foot">Клетчатка — {formatNumber(r.nutrition.fiber)} г. Значения приблизительные.</p>
            )}
          </div>

          <div class="card card-pad info-card">
            <h3 class="info-title">
              <Leaf aria-hidden="true" />
              Сезон
            </h3>
            <p class="info-big display">
              {r.seasonality.months.length === 12
                ? 'Круглый год'
                : r.seasonality.months.includes(month)
                  ? 'Сейчас самое время'
                  : `Не сезон в ${MONTHS_IN[month - 1]}`}
            </p>
            <MonthStrip months={r.seasonality.months} />
            {r.seasonality.note && <p class="muted info-foot">{r.seasonality.note}</p>}
          </div>

          <div class="card card-pad info-card">
            <h3 class="info-title">
              <Refrigerator aria-hidden="true" />
              Хранение
            </h3>
            <StorageSummary recipe={r} />
          </div>

          <div class="card card-pad info-card">
            <h3 class="info-title">
              <Snowflake aria-hidden="true" />
              Заморозка
            </h3>
            {r.freezing.suitable ? (
              <>
                <p class="info-big display">
                  до {countLabel(r.freezing.months, ['месяца', 'месяцев', 'месяцев'])}
                </p>
                <dl class="info-dl">
                  <dt>Как заморозить</dt>
                  <dd>{r.freezing.how}</dd>
                  <dt>Как разморозить</dt>
                  <dd>{r.freezing.thawing}</dd>
                </dl>
              </>
            ) : (
              <>
                <p class="info-big display">Не замораживать</p>
                <p class="muted">{r.freezing.note}</p>
              </>
            )}
          </div>

          <div class="card card-pad info-card info-wide">
            <h3 class="info-title">
              <Sun aria-hidden="true" />
              Разогрев
            </h3>
            {r.reheating.methods.length > 0 ? (
              <ul class="reheat-list">
                {r.reheating.methods.map((m) => {
                  const meta = REHEAT[m.method];
                  return (
                    <li key={m.method}>
                      <span class="reheat-icon">
                        <meta.icon aria-hidden="true" />
                      </span>
                      <div>
                        <p class="reheat-title">
                          {meta.label}
                          {m.minutes && <span class="faint num"> · {formatDuration(m.minutes)}</span>}
                        </p>
                        <p class="muted">{m.instructions}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {r.reheating.note && <p class={r.reheating.methods.length ? 'faint info-foot' : 'muted'}>{r.reheating.note}</p>}
          </div>
        </div>
      </section>

      {r.source && (
        <p class="faint recipe-source">
          Источник:{' '}
          {r.source.url ? (
            <a href={r.source.url} target="_blank" rel="noreferrer">
              {r.source.name}
            </a>
          ) : (
            r.source.name
          )}
        </p>
      )}
    </article>
  );
}

function IngredientRow({ item, factor }: { item: Ingredient; factor: number }) {
  const [got, setGot] = useState(false);
  const scalable = item.unit !== 'pinch';
  const amount =
    item.amount === undefined
      ? null
      : factor === 1 || !scalable
        ? formatAmount(item.amount, item.unit, item.amountMax)
        : formatAmount(
            roundAmount(item.amount * factor, item.unit),
            item.unit,
            item.amountMax !== undefined ? roundAmount(item.amountMax * factor, item.unit) : undefined,
          );

  return (
    <li>
      <button type="button" class={`ingredient${got ? ' is-checked' : ''}`} onClick={() => setGot((v) => !v)} aria-pressed={got}>
        <span class="check">
          <Check />
        </span>
        <span class="ingredient-amount num">{amount ?? (item.toTaste ? 'по вкусу' : '')}</span>
        <span class="ingredient-name">
          {item.name}
          {item.optional && <span class="faint"> · по желанию</span>}
          {item.note && <span class="ingredient-note">{item.note}</span>}
        </span>
      </button>
    </li>
  );
}

/** Отметки шагов живут, пока открыта страница. */
function RecipeSteps({ recipe: r }: { recipe: Recipe }) {
  const [done, setDone] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  return <Steps groups={r.steps} path={`/recipes/${r.id}/`} title={r.title} done={done} onToggle={toggle} />;
}

function StorageSummary({ recipe: r }: { recipe: Recipe }) {
  const { fridgeDays, roomDays, container, note } = r.storage;
  const DAYS = ['дня', 'дней', 'дней'] as const;
  return (
    <>
      <p class="info-big display">
        {fridgeDays === 0
          ? 'Лучше сразу'
          : fridgeDays !== undefined
            ? `до ${countLabel(fridgeDays, DAYS)}`
            : roomDays !== undefined
              ? `до ${countLabel(roomDays, DAYS)}`
              : '—'}
      </p>
      <dl class="info-dl">
        {fridgeDays !== undefined && fridgeDays > 0 && (
          <>
            <dt>
              <Refrigerator aria-hidden="true" /> Холодильник
            </dt>
            <dd>{countLabel(fridgeDays, ['день', 'дня', 'дней'])}</dd>
          </>
        )}
        {roomDays !== undefined && roomDays > 0 && (
          <>
            <dt>
              <Archive aria-hidden="true" /> При комнатной температуре
            </dt>
            <dd>{countLabel(roomDays, ['день', 'дня', 'дней'])}</dd>
          </>
        )}
        {container && (
          <>
            <dt>Тара</dt>
            <dd>{container}</dd>
          </>
        )}
      </dl>
      {note && <p class="muted info-foot">{note}</p>}
    </>
  );
}
