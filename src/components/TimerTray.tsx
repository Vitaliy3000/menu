import { Pause, Play, Plus, X } from 'lucide-preact';
import { formatCountdown } from '../lib/format.ts';
import { navigate } from '../lib/router.tsx';
import {
  addMinute,
  dismissTimer,
  pauseTimer,
  remainingMs,
  resumeTimer,
  useNow,
  useTimers,
  type KitchenTimer,
} from '../lib/timers.ts';

/** Плашка с идущими таймерами. compact — для режима готовки. */
export function TimerTray({ inline = false }: { inline?: boolean }) {
  const timers = useTimers();
  const now = useNow(timers.some((t) => t.endsAt !== null), 250);
  if (timers.length === 0) return null;

  const sorted = [...timers].sort((a, b) => remainingMs(a, now) - remainingMs(b, now));

  return (
    <section class={inline ? 'timer-tray is-inline' : 'timer-tray'} aria-label="Таймеры" aria-live="polite">
      {sorted.map((t) => (
        <TimerChip key={t.id} timer={t} now={now} />
      ))}
    </section>
  );
}

function TimerChip({ timer, now }: { timer: KitchenTimer; now: number }) {
  const left = remainingMs(timer, now);
  const fired = timer.firedAt !== null;
  const paused = timer.endsAt === null && !fired;
  const progress = fired ? 1 : 1 - left / timer.durationMs;

  return (
    <div class={`timer-chip${fired ? ' is-fired' : ''}${paused ? ' is-paused' : ''}`} style={{ '--p': progress }}>
      <button
        class="timer-main"
        type="button"
        onClick={() => navigate(timer.source.path + (timer.source.stepId ? `?tab=steps&step=${timer.source.stepId}` : ''))}
        title={timer.source.title}
      >
        <span class="timer-label">{timer.label}</span>
        <span class="timer-time num">{fired ? 'Готово!' : formatCountdown(left)}</span>
      </button>
      <div class="timer-actions">
        {!fired && (
          <button
            class="timer-btn"
            type="button"
            onClick={() => (paused ? resumeTimer(timer.id) : pauseTimer(timer.id))}
            aria-label={paused ? 'Продолжить' : 'Пауза'}
          >
            {paused ? <Play /> : <Pause />}
          </button>
        )}
        <button class="timer-btn" type="button" onClick={() => addMinute(timer.id)} aria-label="Добавить минуту">
          <Plus />
        </button>
        <button class="timer-btn" type="button" onClick={() => dismissTimer(timer.id)} aria-label="Убрать таймер">
          <X />
        </button>
      </div>
    </div>
  );
}
