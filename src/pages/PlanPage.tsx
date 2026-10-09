import { ChefHat, Clock3, ChevronLeft, Clock, Flame, Play, RotateCcw, Users, UtensilsCrossed } from 'lucide-preact';
import { countLabel, formatClock, formatDuration } from '../lib/format.ts';
import {
  activeRole,
  currentStepIndex,
  dishTones,
  doneStepCount,
  gotCount as countGot,
  mySteps,
  planBase,
  roleSteps,
  shoppingKeys,
  totalPortions,
} from '../lib/plan.ts';
import { usePlanProgress } from '../lib/progress.ts';
import { Link, navigate, setQuery, useLocation } from '../lib/router.tsx';
import type { CookPlan, Role } from '../types/cook-plan.gen.ts';
import { CookMode } from './plan/CookMode.tsx';
import { Overview } from './plan/Overview.tsx';
import { Products } from './plan/Products.tsx';
import { Ration } from './plan/Ration.tsx';
import { planPath } from './plan/StepParts.tsx';
import { Timeline } from './plan/Timeline.tsx';

type Tab = 'overview' | 'products' | 'steps' | 'ration';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Обзор' },
  { id: 'products', label: 'Продукты' },
  { id: 'steps', label: 'Ход работ' },
  { id: 'ration', label: 'Рацион' },
];

export function PlanPage({ plan }: { plan: CookPlan }) {
  const { query } = useLocation();
  const [progress, actions] = usePlanProgress(plan.id);
  const tabs = TABS.filter((t) => t.id !== 'ration' || plan.ration);
  const tab = (tabs.find((t) => t.id === query.get('tab'))?.id ?? 'overview') as Tab;
  const cookStep = query.get('cook');
  const tones = dishTones(plan);
  const base = planBase(plan, progress.startedAt);
  const doneCount = doneStepCount(plan, progress);
  const gotCount = countGot(plan, progress);
  const role = activeRole(plan, progress);
  const steps = mySteps(plan, progress);
  const current = steps[currentStepIndex(steps, progress.done)] ?? steps[steps.length - 1]!;
  const needsRole = Boolean(plan.roles) && !role;
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

  /** Старт за роль: сразу открывает первый невыполненный шаг этой роли. */
  const startAs = (r: Role) => {
    const own = roleSteps(plan, r);
    const first = own[currentStepIndex(own, progress.done)] ?? own[0]!;
    actions.start(r.id);
    navigate(`${planPath(plan)}?tab=steps&cook=${first.id}`);
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
        <p class="eyebrow">
          Техкарта
          {progress.startedAt && end
            ? ` · начали в ${formatClock(new Date(progress.startedAt))}, по плану до ${formatClock(end)}`
            : plan.start && end
              ? ` · старт в ${plan.start}, готово к ${formatClock(end)}`
              : ''}
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
        {needsRole ? (
          <div class="plan-cta-roles">
            {plan.roles!.map((r) => (
              <button key={r.id} type="button" class="btn btn-primary btn-lg plan-cta-main" onClick={() => startAs(r)}>
                <Play aria-hidden="true" />
                Начать: {r.name}
              </button>
            ))}
          </div>
        ) : (
          <button type="button" class="btn btn-primary btn-lg plan-cta-main" onClick={() => openCook()}>
            {started ? <Flame aria-hidden="true" /> : <Play aria-hidden="true" />}
            {doneCount === steps.length ? 'Открыть режим готовки' : started ? `Продолжить · шаг ${steps.indexOf(current) + 1}` : 'Начать готовку'}
            {role && <span class="plan-cta-role"> · {role.name}</span>}
          </button>
        )}
        <div class="plan-cta-side">
          {needsRole && (
            <span class="faint plan-cta-hint">
              <Users aria-hidden="true" />
              Каждый — на своём телефоне: выберите роль и нажмите одновременно, договорившись голосом.
            </span>
          )}
          {role && (
            <button type="button" class="btn btn-ghost btn-sm" onClick={() => actions.setRole(undefined)}>
              <Users aria-hidden="true" />
              Сменить роль
            </button>
          )}
          {started && (
            <span class="plan-cta-progress num">
              <span class="progress-line" aria-hidden="true">
                <span style={{ transform: `scaleX(${doneCount / steps.length})` }} />
              </span>
              {doneCount} из {steps.length} шагов
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
              <Clock3 aria-hidden="true" />
              Время шагов — от старта в {plan.start}; после «Начать» — от фактического.
            </span>
          )}
        </div>
      </div>

      <div class="plan-tabs" role="tablist" aria-label="Разделы техкарты">
        <div class="tabs">
          {tabs.map((t) => (
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
                  {gotCount}/{shoppingKeys(plan).length}
                </span>
              )}
              {t.id === 'steps' && (
                <span class="tab-count">
                  {doneCount}/{steps.length}
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
        {tab === 'ration' && plan.ration && <Ration plan={plan} ration={plan.ration} tones={tones} progress={progress} />}
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
