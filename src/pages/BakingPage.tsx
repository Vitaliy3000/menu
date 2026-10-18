import { ExternalLink, Wheat } from 'lucide-preact';
import { SectionNav } from '../components/SectionNav.tsx';
import { StatBadge } from '../components/StatBadge.tsx';
import { bakes, baking } from '../data/index.ts';
import { doughGrams, panSummary } from '../lib/baking.ts';
import { countLabel, formatNumber } from '../lib/format.ts';
import { ATTEMPT_OUTCOMES, BAKE_KIND_ORDER, BAKE_KINDS } from '../lib/labels.ts';
import { Link } from '../lib/router.tsx';
import type { Bake } from '../types/bake.gen.ts';
import type { Guide, GuidePoint } from '../types/baking.gen.ts';

export function BakingPage() {
  const groups = BAKE_KIND_ORDER.map((kind) => ({ kind, items: bakes.filter((b) => b.kind === kind) })).filter((g) => g.items.length > 0);
  const sections = [
    { id: 'bakes', label: 'Рецептуры' },
    ...(baking?.guides.map((g) => ({ id: g.id, label: g.title })) ?? []),
    ...(baking?.ideas?.length ? [{ id: 'ideas', label: 'Что испечь' }] : []),
  ];

  return (
    <div class="container page baking">
      <header class="page-head">
        <h1 class="display h1">
          Выпечка<span class="count num">{bakes.length}</span>
        </h1>
        <p class="lead">
          Хлеб и пицца: формулы в граммах и пекарских процентах, режимы с температурами и таймерами, заметки с пробных выпечек.
          Ниже — справочник: формовой хлеб и что испечь дальше.
        </p>
      </header>

      <SectionNav label="Разделы выпечки" sections={sections} always />

      <section id="bakes" class="baking-section">
        <h2 class="display h2 section-heading">Рецептуры</h2>
        {groups.length === 0 ? (
          <div class="empty">
            <span class="plate tone-wheat">
              <Wheat />
            </span>
            <p>Пока нет ни одной рецептуры. Добавьте JSON в data/bakes.</p>
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.kind} class="bake-group">
              <h3 class="eyebrow bake-group-title">{BAKE_KINDS[g.kind].plural}</h3>
              <ul class="plan-list">
                {g.items.map((b) => (
                  <li key={b.id}>
                    <BakeCard bake={b} />
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
        <p class="faint bake-more">
          Сладкая выпечка — эклеры, маффины, шарлотка — в <Link to="/?cat=baking">рецептах</Link>.
        </p>
      </section>

      {baking?.guides.map((g) => <GuideSection key={g.id} guide={g} />)}

      {baking?.ideas && baking.ideas.length > 0 && (
        <section id="ideas" class="baking-section">
          <h2 class="display h2 section-heading">Что испечь дальше</h2>
          <ul class="idea-list">
            {baking.ideas.map((idea) => (
              <li key={idea.title} class="card idea">
                <p class="idea-title">{idea.title}</p>
                {idea.note && <p class="faint idea-note">{idea.note}</p>}
                {idea.links && (
                  <p class="idea-links">
                    {idea.links.map((l) => (
                      <a key={l.url} href={l.url} target="_blank" rel="noreferrer">
                        {l.name}
                        <ExternalLink aria-hidden="true" />
                      </a>
                    ))}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function BakeCard({ bake: b }: { bake: Bake }) {
  const m = b.methods[0];
  const count = m.pan?.count ?? 1;
  const perPan = doughGrams(m.formula) / count;
  const steps = m.stages.reduce((n, s) => n + s.steps.length, 0);
  const last = b.attempts?.at(-1);
  const outcome = last && ATTEMPT_OUTCOMES[last.outcome];

  return (
    <Link to={`/baking/${b.id}/`} class="plan-card bake-card">
      <StatBadge top="тесто" value={formatNumber(Math.round(perPan))} bottom={count > 1 ? `г × ${count}` : 'г'} />
      <div class="plan-card-body">
        {(b.original || outcome) && (
          <div class="plan-card-top">
            {outcome && (
              <span class={`badge ${outcome.badge}`}>
                <outcome.icon aria-hidden="true" />
                {outcome.label}
              </span>
            )}
            {b.original && <span class="faint">{b.original}</span>}
          </div>
        )}
        <h3 class="display plan-card-title">{b.title}</h3>
        <p class="plan-card-summary">{b.description}</p>
        <p class="faint plan-card-foot num">
          {m.pan && `${panSummary(m.pan)} · `}
          {b.methods.length > 1 ? `${b.methods.map((x) => x.title?.toLowerCase()).join(' или ')} · ` : ''}
          {countLabel(steps, ['шаг', 'шага', 'шагов'])}
        </p>
      </div>
    </Link>
  );
}

function GuideSection({ guide: g }: { guide: Guide }) {
  return (
    <section id={g.id} class="baking-section">
      <h2 class="display h2 section-heading">{g.title}</h2>
      <p class="muted baking-lead">{g.summary}</p>
      <div class="baking-grid">
        {g.sections.map((s) => (
          <article key={s.title} class="card card-pad guide-card">
            <h3 class="info-title">{s.title}</h3>
            {s.text && <p class="muted">{s.text}</p>}
            {s.points && (
              <ul class="guide-points">
                {s.points.map((p, i) => (
                  <GuidePointItem key={i} point={p} />
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function GuidePointItem({ point: p }: { point: GuidePoint }) {
  if (typeof p === 'string') return <li class="guide-bullet">{p}</li>;
  return (
    <li class="guide-detail">
      <p class="guide-detail-title">{p.title}</p>
      {p.text && <p class="muted">{p.text}</p>}
      {p.points && (
        <ul class="bullets">
          {p.points.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}
    </li>
  );
}
