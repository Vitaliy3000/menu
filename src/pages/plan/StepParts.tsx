import { Flame, Hourglass, Play, Timer as TimerIcon } from 'lucide-preact';
import { formatAmount, formatCountdown, formatDuration } from '../../lib/format.ts';
import { remainingMs, startTimer, useNow, useTimers } from '../../lib/timers.ts';
import type { CookPlan, PlanStep } from '../../types/cook-plan.gen.ts';

export const planPath = (plan: CookPlan) => `/plans/${plan.id}/`;

/** Продукты шага с точными количествами — чтобы не листать к закупке. */
export function UsesList({ plan, step, large = false }: { plan: CookPlan; step: Pick<PlanStep, 'uses'>; large?: boolean }) {
  if (!step.uses?.length) return null;
  return (
    <ul class={`uses${large ? ' is-large' : ''}`}>
      {step.uses.map((use, i) => {
        const ing = plan.ingredients.find((x) => x.id === use.ingredient);
        if (!ing) return null;
        const amount =
          use.amount !== undefined && use.unit
            ? formatAmount(use.amount, use.unit)
            : use.toTaste
              ? 'по вкусу'
              : formatAmount(ing.amount, ing.unit);
        return (
          <li key={i}>
            <span class="uses-amount num">{amount}</span>
            <span class="uses-name">
              {ing.name}
              {use.note && <span class="faint"> · {use.note}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function StepBadges(props: { plan: CookPlan; step: PlanStep; tones: Map<string, string>; showEquipment?: boolean }) {
  const { plan, step, tones, showEquipment = true } = props;
  const equipment = (step.equipment ?? [])
    .map((id) => plan.equipment.find((e) => e.id === id)?.name)
    .filter(Boolean)
    .join(', ');
  const dishes = plan.dishes.filter((d) => step.dishes?.includes(d.id));
  return (
    <div class="step-badges">
      <span class="step-dur num">
        {step.passive ? <Hourglass aria-hidden="true" /> : null}
        {formatDuration(step.duration)}
      </span>
      {step.heat && (
        <span class="badge badge-accent">
          <Flame aria-hidden="true" />
          {step.heat}
        </span>
      )}
      {dishes.length > 0 && (
        <span class="dish-tags" title={dishes.map((d) => d.name).join(', ')}>
          <span class="dish-dots">
            {dishes.map((d) => (
              <span key={d.id} class={`dot tone-${tones.get(d.id)}`} />
            ))}
          </span>
          <span class="dish-names">{dishes.map((d) => d.name).join(', ')}</span>
        </span>
      )}
      {showEquipment && equipment && <span class="step-equipment">{equipment}</span>}
    </div>
  );
}

/** Кнопка таймера шага: показывает живой обратный отсчёт, если таймер уже идёт. */
export function StepTimerButton({ plan, step, size = 'md' }: { plan: CookPlan; step: PlanStep; size?: 'md' | 'lg' }) {
  const timers = useTimers();
  const timer = step.timer ? timers.find((t) => t.source.path === planPath(plan) && t.source.stepId === step.id) : undefined;
  const now = useNow(Boolean(timer && timer.endsAt !== null), 250);
  if (!step.timer) return null;
  const { minutes, label } = step.timer;

  const start = () => startTimer({ label, minutes, source: { path: planPath(plan), title: plan.title, stepId: step.id } });

  if (timer) {
    const fired = timer.firedAt !== null;
    return (
      <button type="button" class={`timer-btn-step is-running${fired ? ' is-fired' : ''} size-${size}`} onClick={start} title="Перезапустить">
        <TimerIcon aria-hidden="true" />
        <span class="num">{fired ? 'Время вышло' : formatCountdown(remainingMs(timer, now))}</span>
        <span class="timer-btn-label">{label}</span>
      </button>
    );
  }
  return (
    <button type="button" class={`timer-btn-step size-${size}`} onClick={start}>
      <Play aria-hidden="true" />
      <span>Таймер {formatDuration(minutes)}</span>
      <span class="timer-btn-label">{label}</span>
    </button>
  );
}
