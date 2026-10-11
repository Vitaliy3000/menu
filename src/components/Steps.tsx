import { Check, Lightbulb, Thermometer, Timer } from 'lucide-preact';
import { formatDurationRange, formatTemp } from '../lib/format.ts';
import { startTimer, useTimers } from '../lib/timers.ts';

export interface StepItem {
  text: string;
  minutes?: number;
  /** Верхняя граница времени; таймер ставится на нижнюю. */
  minutesMax?: number;
  tip?: string;
  temp?: number;
  tempMax?: number;
}

export interface StepGroupItem {
  title?: string;
  steps: StepItem[];
}

/** Шаги по этапам: отметка «сделано», текущий шаг, подсказки, температура и таймеры. Общие для рецептов и выпечки. */
export function Steps({
  groups,
  path,
  title,
  done,
  onToggle,
  timerPrefix = '',
}: {
  groups: StepGroupItem[];
  /** Страница, на которую ведёт таймер. */
  path: string;
  /** Название блюда в подписи таймера. */
  title: string;
  /** Сквозные номера выполненных шагов, с нуля. */
  done: ReadonlySet<number>;
  onToggle: (i: number) => void;
  /** Префикс stepId таймера: у разных способов одной рецептуры свои таймеры. */
  timerPrefix?: string;
}) {
  const timers = useTimers();
  const current = groups.flatMap((g) => g.steps).findIndex((_, i) => !done.has(i));

  let n = 0;
  return (
    <div class="steps">
      {groups.map((group, gi) => (
        <div key={gi} class="step-group">
          {group.title && <h3 class="step-group-title eyebrow">{group.title}</h3>}
          <ol>
            {group.steps.map((step) => {
              const i = n++;
              const stepId = `${timerPrefix}${i}`;
              const label = `Шаг ${i + 1} · ${title}`;
              const running = timers.some((t) => t.source.path === path && t.source.stepId === stepId);
              const timer = step.minutes !== undefined && step.minutes >= 2;
              return (
                <li key={i} class={`step${done.has(i) ? ' is-done' : ''}${i === current ? ' is-current' : ''}`}>
                  <button type="button" class="step-num" onClick={() => onToggle(i)} aria-pressed={done.has(i)} aria-label={`Шаг ${i + 1}: отметить`}>
                    {done.has(i) ? <Check /> : <span class="num">{i + 1}</span>}
                  </button>
                  <div class="step-body">
                    <p class="step-text" onClick={() => onToggle(i)}>
                      {step.text}
                    </p>
                    {step.tip && (
                      <div class="callout callout-tip">
                        <Lightbulb aria-hidden="true" />
                        <span>{step.tip}</span>
                      </div>
                    )}
                    {(timer || step.temp !== undefined) && (
                      <div class="step-meta">
                        {timer && (
                          <button
                            type="button"
                            class={`step-timer${running ? ' is-running' : ''}`}
                            onClick={() => startTimer({ label, minutes: step.minutes!, source: { path, title, stepId } })}
                            title={running ? 'Перезапустить таймер' : 'Запустить таймер'}
                          >
                            <Timer aria-hidden="true" />
                            {formatDurationRange(step.minutes!, step.minutesMax)}
                            {running && <span class="visually-hidden">, таймер идёт — нажмите, чтобы перезапустить</span>}
                          </button>
                        )}
                        {step.temp !== undefined && (
                          <span class="step-temp num">
                            <Thermometer aria-hidden="true" />
                            {formatTemp(step.temp, step.tempMax)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}
