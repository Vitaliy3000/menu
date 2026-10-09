import { ClipboardList } from 'lucide-preact';
import { DateBadge } from '../components/DateBadge.tsx';
import { plans } from '../data/index.ts';
import { countLabel, formatClock, formatDuration, formatRelativeDay, parseDate, parseDateTime } from '../lib/format.ts';
import { dishTones, planWhen, totalPortions } from '../lib/plan.ts';
import { peekProgress } from '../lib/progress.ts';
import { Link } from '../lib/router.tsx';
import type { CookPlan } from '../types/cook-plan.gen.ts';

export function PlansPage() {
  const today = new Date();
  const upcoming = plans.filter((p) => planWhen(p, today) !== 'past');
  const past = plans.filter((p) => planWhen(p, today) === 'past').reverse();

  return (
    <div class="container page">
      <header class="page-head">
        <h1 class="display h1">
          Техкарты<span class="count num">{plans.length}</span>
        </h1>
        <p class="lead">
          Планы конкретных дней готовки: закупка в итоговых объёмах, техника, таймлайн по минутам, фасовка и хранение. Открывайте
          прямо на кухне — прогресс и таймеры сохраняются на телефоне.
        </p>
      </header>

      {plans.length === 0 && (
        <div class="empty">
          <span class="plate tone-herb">
            <ClipboardList />
          </span>
          <p>Пока нет ни одной техкарты. Добавьте JSON в data/plans.</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 class="eyebrow plans-heading">Впереди</h2>
          <ul class="plan-list">
            {upcoming.map((p) => (
              <li key={p.id}>
                <PlanCard plan={p} today={today} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section class="section">
          <h2 class="eyebrow plans-heading">Прошедшие</h2>
          <ul class="plan-list">
            {past.map((p) => (
              <li key={p.id}>
                <PlanCard plan={p} today={today} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function PlanCard({ plan: p, today }: { plan: CookPlan; today: Date }) {
  const when = planWhen(p, today);
  const progress = peekProgress(p.id);
  const doneCount = progress.done.filter((id) => p.steps.some((s) => s.id === id)).length;
  const tones = dishTones(p);
  const start = p.start ? parseDateTime(p.date, p.start) : null;
  const end = start ? new Date(start.getTime() + p.duration.total * 60_000) : null;

  return (
    <Link to={`/plans/${p.id}/`} class={`plan-card${when === 'past' ? ' is-past' : ''}`}>
      <DateBadge date={p.date} muted={when === 'past'} />
      <div class="plan-card-body">
        <div class="plan-card-top">
          {when === 'today' && <span class="badge badge-accent">Сегодня</span>}
          {when === 'upcoming' && <span class="badge">{formatRelativeDay(parseDate(p.date), today)}</span>}
          {doneCount > 0 && doneCount < p.steps.length && (
            <span class="badge badge-warn num">
              В процессе · {doneCount}/{p.steps.length}
            </span>
          )}
          {doneCount === p.steps.length && <span class="badge badge-done">Готово</span>}
          <span class="faint num plan-card-time">
            {start && end ? `${formatClock(start)}–${formatClock(end)} · ` : ''}
            {formatDuration(p.duration.total)}
          </span>
        </div>
        <h3 class="display plan-card-title">{p.title}</h3>
        <p class="plan-card-summary">{p.summary}</p>
        <div class="plan-card-dishes">
          {p.dishes.map((d) => (
            <span key={d.id} class={`tone-${tones.get(d.id)}`}>
              <span class="dot" />
              {d.name}
            </span>
          ))}
        </div>
        <p class="faint plan-card-foot num">
          {countLabel(totalPortions(p), ['порция', 'порции', 'порций'])} · {countLabel(p.steps.length, ['шаг', 'шага', 'шагов'])} ·{' '}
          {p.conditions.cooks === 1 ? 'готовит 1 человек' : `готовят ${p.conditions.cooks}`}
        </p>
      </div>
    </Link>
  );
}
