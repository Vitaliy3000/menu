import { Check, ChevronLeft, CircleCheck, Clock, ListChecks, Minus, Plus, RotateCcw, Scale, Sandwich, Lightbulb, UtensilsCrossed } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { BakePlate } from '../components/BakePlate.tsx';
import { SectionNav } from '../components/SectionNav.tsx';
import { Steps } from '../components/Steps.tsx';
import { WakeLockToggle } from '../components/WakeLockToggle.tsx';
import { useBakeSteps } from '../lib/bakeProgress.ts';
import { actualLoad, bakerPercent, doughGrams, flourGrams, inFinal, inPart, partGrams, roundGrams } from '../lib/baking.ts';
import { countLabel, formatDuration, formatNumber } from '../lib/format.ts';
import { ATTEMPT_OUTCOMES, BAKE_KINDS } from '../lib/labels.ts';
import { Link, setQuery, useLocation } from '../lib/router.tsx';
import type { Bake, BakeMethod, Formula, Pan } from '../types/bake.gen.ts';

const PANS = ['форма', 'формы', 'форм'] as const;

/** Подпись под крупным значением формы: крышка и загрузка либо название и число форм. */
function panFactSub(pan: Pan, load: number | null): string {
  const lid = pan.lid === undefined ? null : pan.lid ? 'с крышкой' : 'без крышки';
  return [
    pan.volume !== undefined ? (lid ?? pan.name) : pan.size ? pan.name : null,
    pan.count && pan.count > 1 ? `${pan.count} шт.` : null,
    load !== null ? `${Math.round(load)} г/л` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function BakePage({ bake: b }: { bake: Bake }) {
  const { query } = useLocation();
  const method = b.methods.find((m) => m.id === query.get('method')) ?? b.methods[0];
  const isDefault = method === b.methods[0];
  const path = `/baking/${b.id}/${isDefault ? '' : `?method=${method.id}`}`;
  const [done, steps] = useBakeSteps(b.id, method.id);
  const kind = BAKE_KINDS[b.kind];
  const dough = doughGrams(method.formula);
  const pan = method.pan;
  const load = pan ? actualLoad(method.formula, pan) : null;
  const stepCount = method.stages.reduce((n, s) => n + s.steps.length, 0);
  const facts = method.time ? 4 : 3;

  return (
    <article class="container page recipe bake">
      <Link to="/baking/" class="back-link">
        <ChevronLeft aria-hidden="true" />
        Выпечка
      </Link>

      <header class="recipe-hero">
        <div class="recipe-hero-text">
          <p class="eyebrow">
            {kind.label}
            {b.original && ` · ${b.original}`}
          </p>
          <h1 class="display h1">{b.title}</h1>
          <p class="lead">{b.description}</p>
          {b.tags && b.tags.length > 0 && (
            <div class="chip-wrap recipe-tags">
              {b.tags.map((t) => (
                <span key={t} class="tag">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
        <div class="recipe-hero-plate" aria-hidden="true">
          <BakePlate kind={b.kind} size={168} />
        </div>
      </header>

      {b.methods.length > 1 && (
        <div class="bake-methods">
          <div class="tabs" role="tablist" aria-label="Способ">
            {b.methods.map((m, i) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={m === method}
                onClick={() => setQuery({ method: i === 0 ? null : m.id })}
              >
                {m.title}
              </button>
            ))}
          </div>
          {method.note && <p class="muted">{method.note}</p>}
        </div>
      )}

      <dl class="facts" style={{ '--facts': facts }}>
        <div class="fact">
          <dt>
            <Scale aria-hidden="true" />
            Тесто
          </dt>
          <dd class="display num">{formatNumber(roundGrams(dough))} г</dd>
          <dd class="fact-sub num">
            {pan?.count && pan.count > 1
              ? `≈ ${formatNumber(Math.round(dough / pan.count))} г на форму`
              : `мука ${formatNumber(roundGrams(flourGrams(method.formula)))} г`}
          </dd>
        </div>
        <div class="fact">
          <dt>
            <Sandwich aria-hidden="true" />
            Форма
          </dt>
          <dd class="display num">{pan ? (pan.volume !== undefined ? `${formatNumber(pan.volume)} л` : (pan.size ?? pan.name)) : '—'}</dd>
          {pan && <dd class="fact-sub num">{panFactSub(pan, load)}</dd>}
        </div>
        {method.time && (
          <div class="fact">
            <dt>
              <Clock aria-hidden="true" />
              Время
            </dt>
            <dd class="display num">{formatDuration(method.time.total)}</dd>
            <dd class="fact-sub">{method.time.note ?? 'от замеса до духовки'}</dd>
          </div>
        )}
        <div class="fact">
          <dt>
            <ListChecks aria-hidden="true" />
            Шаги
          </dt>
          <dd class="display num">{stepCount}</dd>
          <dd class="fact-sub">{countLabel(method.stages.length, ['этап', 'этапа', 'этапов'])}</dd>
        </div>
      </dl>

      <SectionNav
        label="Разделы рецептуры"
        sections={[
          ...(b.attempts?.length ? [{ id: 'attempts', label: 'Прошлые выпечки' }] : []),
          { id: 'formula', label: 'Формула' },
          { id: 'method', label: 'Приготовление' },
          ...(b.result ? [{ id: 'result', label: 'Результат' }] : []),
          ...(b.troubleshooting?.length ? [{ id: 'troubles', label: 'Если не вышло' }] : []),
          ...(b.tips?.length ? [{ id: 'tips', label: 'Советы' }] : []),
          ...(b.variations ? [{ id: 'variations', label: b.variations.title }] : []),
          ...(b.serving ? [{ id: 'serving', label: 'Подача' }] : []),
        ]}
      />

      {b.attempts && b.attempts.length > 0 && (
        <section id="attempts" class="section attempts">
          <h2 class="display h2 section-heading">Прошлые выпечки</h2>
          <div class="attempt-grid">
            {b.attempts.map((a, i) => {
              const outcome = ATTEMPT_OUTCOMES[a.outcome];
              const m = a.method ? b.methods.find((x) => x.id === a.method) : undefined;
              return (
                <article key={i} class={`card card-pad attempt attempt-${a.outcome}`}>
                  <header class="attempt-head">
                    <span class={`badge ${outcome.badge}`}>
                      <outcome.icon aria-hidden="true" />
                      {outcome.label}
                    </span>
                    {a.title && <h3 class="attempt-title">{a.title}</h3>}
                    {m && b.methods.length > 1 && <span class="faint">{m.title?.toLowerCase()}</span>}
                  </header>
                  <ul class="bullets">
                    {a.notes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <div class="recipe-body">
        <aside class="recipe-aside">
          <FormulaCard key={method.id} method={method} />
        </aside>

        <section id="method" class="method">
          <div class="method-head">
            <h2 class="display h2">Приготовление</h2>
            <div class="method-actions">
              {done.size > 0 && (
                <button type="button" class="btn btn-quiet btn-sm" onClick={steps.reset}>
                  <RotateCcw aria-hidden="true" />
                  Сбросить отметки
                </button>
              )}
              <WakeLockToggle />
            </div>
          </div>
          <Steps groups={method.stages} path={path} title={b.title} done={done} onToggle={steps.toggle} timerPrefix={`${method.id}:`} />
        </section>
      </div>

      {b.result && (
        <section id="result" class="section">
          <h2 class="display h2 section-heading">Каким должен получиться</h2>
          <div class="callout callout-done bake-result">
            <CircleCheck aria-hidden="true" />
            <p>{b.result}</p>
          </div>
        </section>
      )}

      {b.troubleshooting && b.troubleshooting.length > 0 && (
        <section id="troubles" class="section">
          <h2 class="display h2 section-heading">Если что-то пошло не так</h2>
          <dl class="trouble-list">
            {b.troubleshooting.map((t) => (
              <div key={t.problem} class="card card-pad trouble">
                <dt>{t.problem}</dt>
                <dd class="muted">{t.fix}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {b.tips && b.tips.length > 0 && (
        <section id="tips" class="section">
          <h2 class="display h2 section-heading">Советы</h2>
          <ul class="tips">
            {b.tips.map((tip) => (
              <li key={tip}>
                <Lightbulb aria-hidden="true" />
                <p>{tip}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {b.variations && (
        <section id="variations" class="section">
          <h2 class="display h2 section-heading">{b.variations.title}</h2>
          <ul class="variation-list">
            {b.variations.items.map((v) => (
              <li key={v.name} class="card variation">
                <p class="variation-name">{v.name}</p>
                {v.text && <p class="muted">{v.text}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {b.serving && (
        <section id="serving" class="section">
          <h2 class="display h2 section-heading">Подача и хранение</h2>
          <div class="card card-pad info-card bake-serving">
            <h3 class="info-title">
              <UtensilsCrossed aria-hidden="true" />
              Как есть
            </h3>
            <p class="muted">{b.serving}</p>
          </div>
        </section>
      )}

      {b.sources && b.sources.length > 0 && (
        <p class="faint recipe-source bake-sources">
          Источники:{' '}
          {b.sources.map((s, i) => (
            <span key={s.name}>
              {i > 0 && ' · '}
              {s.url ? (
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.name}
                </a>
              ) : (
                s.name
              )}
            </span>
          ))}
        </p>
      )}
    </article>
  );
}

/**
 * Формула: всего и пекарские проценты, а если тесто собирают из частей (предфермент, юдане) —
 * ещё состав каждой части и финального теста. Строки можно отмечать при взвешивании.
 */
function FormulaCard({ method }: { method: BakeMethod }) {
  const [batches, setBatches] = useState(1);
  const [weighed, setWeighed] = useState<Set<string>>(new Set());
  const f = method.formula;
  const parts = f.parts ?? [];
  const flour = flourGrams(f);
  const perBatch = method.pan?.count ?? 1;
  const grams = (g: number) => `${formatNumber(roundGrams(g * batches))}`;
  const toggle = (key: string) =>
    setWeighed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  // С частями общая таблица — для справки, а отмечают строки частей и финального теста.
  const checkable = parts.length === 0;

  return (
    <section id="formula" class="card card-pad formula">
      <div class="ingredients-head">
        <h2 class="display h3">Формула</h2>
        <div class="stepper" role="group" aria-label="Сколько форм">
          <button type="button" onClick={() => setBatches((n) => Math.max(1, n - 1))} aria-label="Меньше форм" disabled={batches <= 1}>
            <Minus />
          </button>
          <span class="num" aria-live="polite">
            {countLabel(batches * perBatch, PANS)}
          </span>
          <button type="button" onClick={() => setBatches((n) => Math.min(12, n + 1))} aria-label="Больше форм">
            <Plus />
          </button>
        </div>
      </div>
      {method.pan && (
        <p class="faint formula-pan">
          {method.pan.name}
          {method.pan.size && `, ${method.pan.size}`}
          {method.pan.volume !== undefined && `, ${formatNumber(method.pan.volume)}\u00a0л`}
        </p>
      )}
      {batches > 1 && (
        <p class="scaled-note">
          Граммы ×{batches}, проценты те же. В тексте шагов — количества на одну закладку.{' '}
          <button type="button" class="link-btn" onClick={() => setBatches(1)}>
            Вернуть
          </button>
        </p>
      )}

      <div class="formula-list">
        <div class="formula-row formula-head" aria-hidden="true">
          <span>Ингредиент</span>
          <span>г</span>
          <span>%</span>
        </div>
        {f.ingredients.map((ing) => (
          <FormulaRow
            key={ing.name}
            name={ing.name}
            note={ing.note}
            optional={ing.optional}
            grams={grams(ing.grams)}
            percent={formatNumber(Math.round(bakerPercent(ing.grams, flour) * 10) / 10)}
            checked={checkable ? weighed.has(`all:${ing.name}`) : undefined}
            onToggle={checkable ? () => toggle(`all:${ing.name}`) : undefined}
          />
        ))}
        <div class="formula-row formula-total">
          <span>Тесто</span>
          <span class="num">{grams(doughGrams(f))}</span>
          <span class="num">{formatNumber(Math.round(bakerPercent(doughGrams(f), flour)))}</span>
        </div>
      </div>

      {parts.map((p) => (
        <PartList
          key={p.id}
          title={p.name}
          total={grams(partGrams(f, p.id))}
          rows={f.ingredients.filter((i) => inPart(i, p.id) > 0).map((i) => ({ name: i.name, grams: grams(inPart(i, p.id)) }))}
          weighed={weighed}
          prefix={p.id}
          toggle={toggle}
        />
      ))}
      {parts.length > 0 && (
        <PartList
          title="Финальное тесто"
          total={grams(doughGrams(f))}
          rows={finalRows(f).map((r) => ({ name: r.name, grams: grams(r.grams) }))}
          weighed={weighed}
          prefix="final"
          toggle={toggle}
        />
      )}
    </section>
  );
}

/** Финальное тесто: части целиком, затем остатки ингредиентов. */
function finalRows(f: Formula): { name: string; grams: number }[] {
  return [
    ...(f.parts ?? []).map((p) => ({ name: p.name, grams: partGrams(f, p.id) })),
    ...f.ingredients.filter((i) => roundGrams(inFinal(i)) > 0).map((i) => ({ name: i.name, grams: inFinal(i) })),
  ];
}

function PartList({
  title,
  total,
  rows,
  weighed,
  prefix,
  toggle,
}: {
  title: string;
  total: string;
  rows: { name: string; grams: string }[];
  weighed: Set<string>;
  prefix: string;
  toggle: (key: string) => void;
}) {
  return (
    <div class="formula-part">
      <h3 class="eyebrow">
        {title} · <span class="num">{total} г</span>
      </h3>
      <div class="formula-list">
        {rows.map((r) => (
          <FormulaRow
            key={r.name}
            name={r.name}
            grams={r.grams}
            checked={weighed.has(`${prefix}:${r.name}`)}
            onToggle={() => toggle(`${prefix}:${r.name}`)}
          />
        ))}
      </div>
    </div>
  );
}

function FormulaRow({
  name,
  note,
  optional,
  grams,
  percent,
  checked,
  onToggle,
}: {
  name: string;
  note?: string;
  optional?: boolean;
  grams: string;
  percent?: string;
  checked?: boolean;
  onToggle?: () => void;
}) {
  const content = (
    <>
      {onToggle && (
        <span class="check">
          <Check />
        </span>
      )}
      <span class="formula-name">
        {name}
        {optional && <span class="faint"> · по желанию</span>}
        {note && <span class="ingredient-note">{note}</span>}
      </span>
      <span class="formula-grams num">{grams}</span>
      {percent !== undefined && <span class="formula-percent num">{percent}</span>}
    </>
  );
  const cls = `formula-row${onToggle ? ' is-checkable' : ''}${percent === undefined ? ' no-percent' : ''}${checked ? ' is-checked' : ''}`;
  return onToggle ? (
    <button type="button" class={cls} onClick={onToggle} aria-pressed={checked}>
      {content}
    </button>
  ) : (
    <div class={cls}>{content}</div>
  );
}
