import { Check, ChevronLeft, ChevronRight, Eye, Hourglass, Lightbulb, PartyPopper, Sun, TriangleAlert, X } from 'lucide-preact';
import { useEffect, useRef } from 'preact/hooks';
import { TimerTray } from '../../components/TimerTray.tsx';
import { formatClock, formatOffset } from '../../lib/format.ts';
import { activeRole, mySteps, stepTime } from '../../lib/plan.ts';
import type { PlanProgress } from '../../lib/progress.ts';
import { findTimer, startTimer, useNow } from '../../lib/timers.ts';
import { useWakeLock } from '../../lib/wakeLock.ts';
import type { CookPlan } from '../../types/cook-plan.gen.ts';
import { planPath, StepBadges, StepTimerButton, UsesList } from './StepParts.tsx';

interface Props {
  plan: CookPlan;
  tones: Map<string, string>;
  progress: PlanProgress;
  base: Date | null;
  stepId: string;
  onNavigate: (stepId: string) => void;
  onToggleDone: (stepId: string, on?: boolean) => void;
  onClose: () => void;
}

/** Полноэкранный пошаговый режим для телефона у плиты. */
export function CookMode({ plan, tones, progress, base, stepId, onNavigate, onToggleDone, onClose }: Props) {
  // Свои шаги, если на устройстве выбрана роль; шаг чужой роли (открыт из «Все шаги») листается по всем.
  const own = mySteps(plan, progress);
  const role = activeRole(plan, progress);
  const steps = own.some((s) => s.id === stepId) ? own : plan.steps;
  const index = Math.max(0, steps.findIndex((s) => s.id === stepId));
  const step = steps[index]!;
  const prev = steps[index - 1];
  const next = steps[index + 1];
  const done = progress.done.includes(step.id);
  const doneCount = steps.filter((s) => progress.done.includes(s.id)).length;
  const allDone = doneCount === steps.length;
  const wakeLock = useWakeLock(true);
  const scroller = useRef<HTMLDivElement>(null);
  const now = useNow(progress.startedAt !== null, 15_000);

  useEffect(() => {
    document.body.dataset.cookMode = '';
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      delete document.body.dataset.cookMode;
      document.body.style.overflow = overflow;
    };
  }, []);

  useEffect(() => scroller.current?.scrollTo(0, 0), [stepId]);

  const complete = () => {
    if (done) {
      onToggleDone(step.id, false);
      return;
    }
    // Пассивный шаг с таймером: «поставил и пошёл дальше» — запускаем таймер сами.
    if (step.passive && step.timer && !findTimer(planPath(plan), step.id, step.timer.label)) {
      startTimer({ label: step.timer.label, minutes: step.timer.minutes, source: { path: planPath(plan), title: plan.title, stepId: step.id } });
    }
    onToggleDone(step.id, true);
    const after = steps.slice(index + 1).find((s) => !progress.done.includes(s.id));
    if (after) onNavigate(after.id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('button') && (e.key === 'Enter' || e.key === ' ')) return;
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && next) onNavigate(next.id);
      else if (e.key === 'ArrowLeft' && prev) onNavigate(prev.id);
      else if (e.key === 'Enter') complete();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Свайп влево/вправо — соседний шаг.
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touch.current = t ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touch.current;
    const t = e.changedTouches[0];
    touch.current = null;
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0 && next) onNavigate(next.id);
    if (dx > 0 && prev) onNavigate(prev.id);
  };

  const lag = progress.startedAt && !done ? Math.round((now - progress.startedAt) / 60_000 - step.at) : null;

  return (
    <div class="cook" role="dialog" aria-modal="true" aria-label={`Режим готовки: ${plan.title}`}>
      <header class="cook-top">
        <button type="button" class="icon-btn" onClick={onClose} aria-label="Закрыть режим готовки">
          <X />
        </button>
        <div class="cook-progress">
          <span class="num">
            {role && steps === own ? `${role.name} · ` : ''}Шаг {index + 1} из {steps.length}
          </span>
          <span class="cook-bar" aria-hidden="true">
            <span style={{ transform: `scaleX(${doneCount / steps.length})` }} />
          </span>
        </div>
        <span class={`cook-wake${wakeLock ? ' is-on' : ''}`} title={wakeLock ? 'Экран не погаснет' : 'Браузер не поддерживает блокировку экрана'}>
          <Sun aria-hidden="true" />
        </span>
      </header>

      <div class="cook-scroll" ref={scroller} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div class="cook-inner">
          <TimerTray inline />

          {allDone && (
            <div class="cook-finish">
              <PartyPopper aria-hidden="true" />
              <div>
                <p class="display h3">Все шаги выполнены</p>
                <p class="muted">Проверьте фасовку и подписи на контейнерах во вкладке «Обзор».</p>
              </div>
            </div>
          )}

          <p class="cook-when num">
            {base && <strong>{formatClock(stepTime(base, step.at))}</strong>}
            <span>{formatOffset(step.at)}</span>
            {step.passive && (
              <span class="cook-passive">
                <Hourglass aria-hidden="true" />
                руки свободны
              </span>
            )}
            {lag !== null && Math.abs(lag) >= 5 && (
              <span class={`cook-lag${lag > 0 ? ' is-late' : ''}`}>{lag > 0 ? `отставание ${lag} мин` : `запас ${-lag} мин`}</span>
            )}
          </p>

          <h1 class={`display cook-title${done ? ' is-done' : ''}`}>{step.title}</h1>
          <StepBadges plan={plan} step={step} tones={tones} activeRole={role?.id} />

          {step.details && <p class="cook-text">{step.details}</p>}

          <UsesList plan={plan} step={step} large />

          {step.doneWhen && (
            <div class="callout callout-done cook-callout">
              <Eye aria-hidden="true" />
              <span>
                <strong>Готово, когда:</strong> {step.doneWhen}
              </span>
            </div>
          )}
          {step.warning && (
            <div class="callout callout-warn cook-callout">
              <TriangleAlert aria-hidden="true" />
              <span>{step.warning}</span>
            </div>
          )}
          {step.tip && (
            <div class="callout callout-tip cook-callout">
              <Lightbulb aria-hidden="true" />
              <span>{step.tip}</span>
            </div>
          )}

          <StepTimerButton plan={plan} step={step} size="lg" />

          {next && (
            <button type="button" class="cook-next" onClick={() => onNavigate(next.id)}>
              <span class="eyebrow">
                Дальше · {base ? formatClock(stepTime(base, next.at)) : formatOffset(next.at)}
              </span>
              <span class="cook-next-title">{next.title}</span>
              <ChevronRight aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <footer class="cook-bottom">
        <button type="button" class="cook-nav" onClick={() => prev && onNavigate(prev.id)} disabled={!prev} aria-label="Предыдущий шаг">
          <ChevronLeft />
        </button>
        <button type="button" class={`btn btn-lg cook-done${done ? ' is-done' : ''}`} onClick={complete}>
          <Check aria-hidden="true" />
          {done ? 'Сделано — снять' : step.passive && step.timer ? 'Таймер и дальше' : 'Готово'}
        </button>
        <button type="button" class="cook-nav" onClick={() => next && onNavigate(next.id)} disabled={!next} aria-label="Следующий шаг">
          <ChevronRight />
        </button>
      </footer>
    </div>
  );
}
