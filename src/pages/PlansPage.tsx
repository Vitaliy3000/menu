import { ClipboardList } from 'lucide-preact';
import { StatBadge } from '../components/StatBadge.tsx';
import { plans } from '../data/index.ts';
import { countLabel, formatDuration, formatMoney } from '../lib/format.ts';
import { dishTones, doneStepCount, mySteps, totalPortions } from '../lib/plan.ts';
import { peekProgress } from '../lib/progress.ts';
import { Link } from '../lib/router.tsx';
import type { CookPlan } from '../types/cook-plan.gen.ts';

export function PlansPage() {
  return (
    <div class="container page">
      <header class="page-head">
        <h1 class="display h1">
          Техкарты<span class="count num">{plans.length}</span>
        </h1>
        <p class="lead">
          Готовые планы дня готовки: закупка в итоговых объёмах, техника, таймлайн по минутам, фасовка и хранение. Открывайте
          прямо на кухне — прогресс и таймеры сохраняются на телефоне.
        </p>
      </header>

      {plans.length === 0 ? (
        <div class="empty">
          <span class="plate tone-herb">
            <ClipboardList />
          </span>
          <p>Пока нет ни одной техкарты. Добавьте JSON в data/plans.</p>
        </div>
      ) : (
        <ul class="plan-list">
          {plans.map((p) => (
            <li key={p.id}>
              <PlanCard plan={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PlanCard({ plan: p }: { plan: CookPlan }) {
  const progress = peekProgress(p.id);
  const doneCount = doneStepCount(p, progress);
  const stepCount = mySteps(p, progress).length;
  const tones = dishTones(p);
  const hours = Math.floor(p.duration.total / 60);
  const minutes = String(p.duration.total % 60).padStart(2, '0');
  const days = p.ration?.days.length ?? 0;

  return (
    <Link to={`/plans/${p.id}/`} class="plan-card">
      <StatBadge top="время" value={`${hours}:${minutes}`} bottom="ч:мин" />
      <div class="plan-card-body">
        <div class="plan-card-top">
          {doneCount > 0 && doneCount < stepCount && (
            <span class="badge badge-warn num">
              В процессе · {doneCount}/{stepCount}
            </span>
          )}
          {doneCount === stepCount && <span class="badge badge-done">Готово</span>}
          <span class="faint num plan-card-time">
            {p.start && `старт в ${p.start} · `}
            {formatDuration(p.duration.total)}, активно {formatDuration(p.duration.active)}
          </span>
        </div>
        <h2 class="display plan-card-title">{p.title}</h2>
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
          {days > 0 && `${countLabel(days, ['день', 'дня', 'дней'])} · `}
          {p.cost && (
            <span title={p.cost.note}>
              ≈ {formatMoney(p.cost.amount, p.cost.currency)} в {p.cost.store}
              {days > 0 && `, ${formatMoney(p.cost.amount / days, p.cost.currency)} в день`} ·{' '}
            </span>
          )}
          {countLabel(totalPortions(p), ['порция', 'порции', 'порций'])} · {countLabel(p.steps.length, ['шаг', 'шага', 'шагов'])} ·{' '}
          {p.conditions.cooks === 1 ? 'готовит 1 человек' : `готовят ${p.conditions.cooks}`}
        </p>
      </div>
    </Link>
  );
}
