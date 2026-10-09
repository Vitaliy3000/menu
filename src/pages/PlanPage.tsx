import { CalendarDays, ChefHat, ChevronLeft, Clock, Flame, Play, RotateCcw, Users, UtensilsCrossed } from 'lucide-preact';
import { DateBadge } from '../components/DateBadge.tsx';
import { countLabel, formatClock, formatDuration, formatLongDate, formatRelativeDay, parseDate } from '../lib/format.ts';
import { currentStepIndex, dishTones, planBase, planWhen, totalPortions } from '../lib/plan.ts';
import { usePlanProgress } from '../lib/progress.ts';
import { Link, navigate, setQuery, useLocation } from '../lib/router.tsx';
import type { CookPlan } from '../types/cook-plan.gen.ts';
import { CookMode } from './plan/CookMode.tsx';
import { Overview } from './plan/Overview.tsx';
import { Products } from './plan/Products.tsx';
import { planPath } from './plan/StepParts.tsx';
import { Timeline } from './plan/Timeline.tsx';

type Tab = 'overview' | 'products' | 'steps';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Обзор' },
  { id: 'products', label: 'Продукты' },
  { id: 'steps', label: 'Ход работ' },
];

export function PlanPage({ plan }: { plan: CookPlan }) {
  const { query } = useLocation();
  const [progress, actions] = usePlanProgress(plan.id);
  const tab = (TABS.find((t) => t.id === query.get('tab'))?.id ?? 'overview') as Tab;
  const cookStep = query.get('cook');
  const tones = dishTones(plan);
  const base = planBase(plan, progress.startedAt);
  const date = parseDate(plan.date);
  const when = planWhen(plan);

  const doneCount = plan.steps.filter((s) => progress.done.includes(s.id)).length;
  const gotCount = plan.ingredients.filter((i) => progress.got.includes(i.id)).length;
  const current = plan.steps[currentStepIndex(plan.steps, progress.done)] ?? plan.steps[plan.steps.length - 1]!;
  const started = progress.startedAt !== null || doneCount > 0;
  const end = base ? new Date(base.getTime() + plan.duration.total * 60_000) : null;

  const openCook = (stepId = current.id) => {
    actions.start();
    // Отдельная запись в истории: кнопка «назад» на телефоне закрывает режим готовки.
    navigate(`${planPath(plan)}?tab=steps&cook=${stepId}`);
  };
  const closeCook = () => {
    if (window.history.length > 1 && window.history.state) window.history.back();
    else setQuery({ cook: null });
  };

  const resetAll = () => {
    if (window.confirm('Сбросить отметки шагов, продуктов и время старта?')) actions.resetAll();
  };

  return (
    <article class="container page plan">
      <Link to="/plans/" class="back-link">
        <ChevronLeft aria-hidden="true" />
        Техкарты
      </Link>

      <header class="plan-hero">
        <DateBadge date={plan.date} muted={when === 'past'} />
        <div class="plan-hero-text">
          <p class="eyebrow">
            {formatLongDate(date)}
            {plan.start && end && ` · ${plan.start}–${formatClock(end)}`}
            {' · '}
            {formatRelativeDay(date)}
          </p>
          <h1 class="display h1">{plan.title}</h1>
          <p class="lead">{plan.summary}</p>
          {plan.tags && plan.tags.length > 0 && (
            <div class="chip-wrap">
              {plan.tags.map((t) => (
                <span key={t} class="tag">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      <dl class="facts" style={{ '--facts': 4 }}>
        <div class="fact">
          <dt>
            <Clock aria-hidden="true" />
            Длительность
          </dt>
          <dd class="display num">{formatDuration(plan.duration.total)}</dd>
          <dd class="fact-sub">активно {formatDuration(plan.duration.active)}</dd>
        </div>
        <div class="fact">
          <dt>
            <UtensilsCrossed aria-hidden="true" />
            Блюда
          </dt>
          <dd class="display num">{plan.dishes.length}</dd>
          <dd class="fact-sub">{countLabel(totalPortions(plan), ['порция', 'порции', 'порций'])}</dd>
        </div>
        <div class="fact">
          <dt>
            <ChefHat aria-hidden="true" />
            Шаги
          </dt>
          <dd class="display num">{plan.steps.length}</dd>
          <dd class="fact-sub">{plan.steps.filter((s) => s.timer).length} с таймером</dd>
        </div>
        <div class="fact">
          <dt>
            <Users aria-hidden="true" />
            Для кого
          </dt>
          <dd class="display num">{plan.conditions.cooks === 1 ? '1 повар' : `${plan.conditions.cooks} повара`}</dd>
          {plan.audience && <dd class="fact-sub">{plan.audience}</dd>}
        </div>
      </dl>

      <div class="plan-cta">
        <button type="button" class="btn btn-primary btn-lg plan-cta-main" onClick={() => openCook()}>
          {started ? <Flame aria-hidden="true" /> : <Play aria-hidden="true" />}
          {doneCount === plan.steps.length ? 'Открыть режим готовки' : started ? `Продолжить · шаг ${plan.steps.indexOf(current) + 1}` : 'Начать готовку'}
        </button>
        <div class="plan-cta-side">
          {started && (
            <span class="plan-cta-progress num">
              <span class="progress-line" aria-hidden="true">
                <span style={{ transform: `scaleX(${doneCount / plan.steps.length})` }} />
              </span>
              {doneCount} из {plan.steps.length} шагов
            </span>
          )}
          {(started || gotCount > 0 || progress.prep.length > 0) && (
            <button type="button" class="btn btn-ghost btn-sm" onClick={resetAll}>
              <RotateCcw aria-hidden="true" />
              Сбросить прогресс
            </button>
          )}
          {!started && plan.start && (
            <span class="faint plan-cta-hint">
              <CalendarDays aria-hidden="true" />
              Время шагов — от старта в {plan.start}; после «Начать» — от фактического.
            </span>
          )}
        </div>
      </div>

      <div class="plan-tabs" role="tablist" aria-label="Разделы техкарты">
        <div class="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setQuery({ tab: t.id === 'overview' ? null : t.id, step: null })}
            >
              {t.label}
              {t.id === 'products' && (
                <span class="tab-count">
                  {gotCount}/{plan.ingredients.length}
                </span>
              )}
              {t.id === 'steps' && (
                <span class="tab-count">
                  {doneCount}/{plan.steps.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div class="plan-panel" role="tabpanel">
        {tab === 'overview' && <Overview plan={plan} tones={tones} progress={progress} togglePrep={(id) => actions.toggle('prep', id)} />}
        {tab === 'products' && <Products plan={plan} progress={progress} toggle={(id) => actions.toggle('got', id)} />}
        {tab === 'steps' && (
          <Timeline
            plan={plan}
            tones={tones}
            progress={progress}
            base={base}
            focusStepId={query.get('step')}
            toggleDone={(id) => actions.toggle('done', id)}
            openCook={openCook}
          />
        )}
      </div>

      {cookStep && (
        <CookMode
          plan={plan}
          tones={tones}
          progress={progress}
          base={base}
          stepId={cookStep}
          onNavigate={(id) => setQuery({ cook: id })}
          onToggleDone={(id, on) => actions.toggle('done', id, on)}
          onClose={closeCook}
        />
      )}
    </article>
  );
}
