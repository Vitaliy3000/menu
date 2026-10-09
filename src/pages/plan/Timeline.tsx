import { Check, ChevronDown, Eye, Lightbulb, Maximize2, TriangleAlert } from 'lucide-preact';
import { Fragment } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { formatClock, formatOffset } from '../../lib/format.ts';
import { activeRole, currentStepIndex, mySteps, roleSteps, stepTime } from '../../lib/plan.ts';
import type { PlanProgress } from '../../lib/progress.ts';
import { useNow } from '../../lib/timers.ts';
import type { CookPlan, PlanStep } from '../../types/cook-plan.gen.ts';
import { StepBadges, StepTimerButton, UsesList } from './StepParts.tsx';

interface Props {
  plan: CookPlan;
  tones: Map<string, string>;
  progress: PlanProgress;
  base: Date | null;
  focusStepId: string | null;
  toggleDone: (id: string) => void;
  openCook: (stepId: string) => void;
}

export function Timeline({ plan, tones, progress, base, focusStepId, toggleDone, openCook }: Props) {
  const [dish, setDish] = useState<string | null>(null);
  // null — шаги своей роли (или все, если роль не выбрана); 'all' — все шаги; иначе — id роли.
  const [roleView, setRoleView] = useState<string | null>(null);
  const myRole = activeRole(plan, progress);
  const viewRole = roleView === 'all' ? undefined : (plan.roles?.find((r) => r.id === roleView) ?? myRole);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(focusStepId ? [focusStepId] : []));
  const own = mySteps(plan, progress);
  const current = own[currentStepIndex(own, progress.done)];
  const now = useNow(progress.startedAt !== null, 30_000);
  const elapsed = progress.startedAt ? (now - progress.startedAt) / 60_000 : null;

  useEffect(() => {
    if (!focusStepId) return;
    setExpanded((prev) => new Set(prev).add(focusStepId));
    requestAnimationFrame(() => document.getElementById(`step-${focusStepId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  }, [focusStepId]);

  const byRole = roleSteps(plan, viewRole);
  const steps = dish ? byRole.filter((s) => s.dishes?.includes(dish)) : byRole;
  const nowIndex = elapsed === null || elapsed > plan.duration.total + 60 ? -1 : steps.findIndex((s) => s.at > elapsed);

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div class="timeline-wrap">
      {plan.roles && (
        <div class="chip-row timeline-filter" role="group" aria-label="Чьи шаги">
          {plan.roles.map((r) => (
            <button key={r.id} class="chip" type="button" aria-pressed={viewRole?.id === r.id} onClick={() => setRoleView(r.id)}>
              {r.name}
              {r.id === myRole?.id && <span class="faint"> · я</span>}
            </button>
          ))}
          <button class="chip" type="button" aria-pressed={!viewRole} onClick={() => setRoleView('all')}>
            Все роли
          </button>
        </div>
      )}
      <div class="chip-row timeline-filter" role="group" aria-label="Фильтр по блюду">
        <button class="chip" type="button" aria-pressed={dish === null} onClick={() => setDish(null)}>
          Все шаги
        </button>
        {plan.dishes.map((d) => (
          <button
            key={d.id}
            class={`chip tone-${tones.get(d.id)}`}
            type="button"
            aria-pressed={dish === d.id}
            onClick={() => setDish(dish === d.id ? null : d.id)}
          >
            <span class="dot" />
            {d.name}
          </button>
        ))}
      </div>

      <ol class="timeline">
        {steps.map((step, i) => (
          <Fragment key={step.id}>
            {i === nowIndex && <NowMarker base={base} now={now} />}
            <TimelineStep
              plan={plan}
              step={step}
              tones={tones}
              base={base}
              done={progress.done.includes(step.id)}
              current={step.id === current?.id}
              open={expanded.has(step.id) || step.id === current?.id}
              activeRoleId={viewRole?.id}
              onToggleDone={() => toggleDone(step.id)}
              onToggleOpen={() => toggleExpanded(step.id)}
              onFocus={() => openCook(step.id)}
            />
          </Fragment>
        ))}
        {nowIndex === -1 && elapsed !== null && elapsed <= plan.duration.total + 60 && <NowMarker base={base} now={now} />}
      </ol>
    </div>
  );
}

function NowMarker({ base, now }: { base: Date | null; now: number }) {
  return (
    <li class="tl-now" aria-label="Сейчас">
      <span class="num">{base ? formatClock(new Date(now)) : ''}</span>
      <span class="tl-now-label">сейчас</span>
    </li>
  );
}

interface StepProps {
  plan: CookPlan;
  step: PlanStep;
  tones: Map<string, string>;
  base: Date | null;
  done: boolean;
  current: boolean;
  open: boolean;
  /** Роль на экране — её бейдж на шагах не показываем. */
  activeRoleId?: string;
  onToggleDone: () => void;
  onToggleOpen: () => void;
  onFocus: () => void;
}

function TimelineStep({ plan, step, tones, base, done, current, open, activeRoleId, onToggleDone, onToggleOpen, onFocus }: StepProps) {
  const cls = ['tl-step', done && 'is-done', current && 'is-current', step.passive && 'is-passive', open && 'is-open'].filter(Boolean).join(' ');
  return (
    <li id={`step-${step.id}`} class={cls}>
      <div class="tl-time num">
        {base ? <span class="tl-clock">{formatClock(stepTime(base, step.at))}</span> : null}
        <span class="tl-offset">{formatOffset(step.at)}</span>
      </div>
      <div class="tl-rail">
        <button type="button" class="check tl-check" onClick={onToggleDone} aria-pressed={done} aria-label={done ? 'Снять отметку' : 'Отметить выполненным'}>
          <Check />
        </button>
      </div>
      <div class="tl-card">
        <button type="button" class="tl-head" onClick={onToggleOpen} aria-expanded={open}>
          <span class="tl-title">{step.title}</span>
          <ChevronDown class="tl-chevron" aria-hidden="true" />
        </button>
        <StepBadges plan={plan} step={step} tones={tones} showEquipment={open} activeRole={activeRoleId} />
        {open && (
          <div class="tl-details">
            {step.details && <p class="tl-text">{step.details}</p>}
            <UsesList plan={plan} step={step} />
            {step.doneWhen && (
              <div class="callout callout-done">
                <Eye aria-hidden="true" />
                <span>
                  <strong>Готово, когда:</strong> {step.doneWhen}
                </span>
              </div>
            )}
            {step.warning && (
              <div class="callout callout-warn">
                <TriangleAlert aria-hidden="true" />
                <span>{step.warning}</span>
              </div>
            )}
            {step.tip && (
              <div class="callout callout-tip">
                <Lightbulb aria-hidden="true" />
                <span>{step.tip}</span>
              </div>
            )}
            <div class="tl-actions">
              <StepTimerButton plan={plan} step={step} />
              <button type="button" class="btn btn-quiet btn-sm" onClick={onFocus}>
                <Maximize2 aria-hidden="true" />
                Режим готовки
              </button>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}
