/**
 * Кухонные таймеры. Живут глобально (видны на любой странице), переживают перезагрузку
 * и блокировку экрана: хранится момент окончания, а не оставшиеся секунды.
 */
import { useEffect, useState } from 'preact/hooks';
import { isObject, persistentStore, useStore } from './store.ts';

export interface KitchenTimer {
  id: string;
  label: string;
  durationMs: number;
  /** Момент окончания, если таймер идёт. */
  endsAt: number | null;
  /** Остаток, если таймер на паузе. */
  remainingMs: number;
  /** Когда прозвенел. */
  firedAt: number | null;
  /** Откуда запущен — чтобы вернуться к шагу. */
  source: { path: string; title: string; stepId?: string };
}

const isTimer = (v: unknown): v is KitchenTimer =>
  isObject(v) && typeof v.id === 'string' && typeof v.label === 'string' && typeof v.durationMs === 'number' && isObject(v.source);

const isTimerList = (v: unknown): v is KitchenTimer[] => Array.isArray(v) && v.every(isTimer);

export const timersStore = persistentStore<KitchenTimer[]>('menu:timers:v1', [], isTimerList);

export const useTimers = () => useStore(timersStore);

export const remainingMs = (t: KitchenTimer, now: number) => (t.endsAt === null ? t.remainingMs : Math.max(0, t.endsAt - now));

export const isRunning = (t: KitchenTimer) => t.endsAt !== null && t.firedAt === null;

const update = (id: string, fn: (t: KitchenTimer) => KitchenTimer) =>
  timersStore.set((list) => list.map((t) => (t.id === id ? fn(t) : t)));

export function findTimer(path: string, stepId: string | undefined, label: string): KitchenTimer | undefined {
  return timersStore.get().find((t) => t.source.path === path && t.source.stepId === stepId && t.label === label);
}

export function startTimer(input: { label: string; minutes: number; source: KitchenTimer['source'] }): void {
  primeAlerts();
  const existing = findTimer(input.source.path, input.source.stepId, input.label);
  const durationMs = Math.round(input.minutes * 60_000);
  const timer: KitchenTimer = {
    id: existing?.id ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    label: input.label,
    durationMs,
    endsAt: Date.now() + durationMs,
    remainingMs: durationMs,
    firedAt: null,
    source: input.source,
  };
  timersStore.set((list) => (existing ? list.map((t) => (t.id === existing.id ? timer : t)) : [...list, timer]));
}

export function pauseTimer(id: string): void {
  update(id, (t) => (t.endsAt === null ? t : { ...t, remainingMs: Math.max(0, t.endsAt - Date.now()), endsAt: null }));
}

export function resumeTimer(id: string): void {
  primeAlerts();
  update(id, (t) => (t.endsAt !== null ? t : { ...t, endsAt: Date.now() + t.remainingMs }));
}

export function addMinute(id: string): void {
  update(id, (t) =>
    t.endsAt === null
      ? { ...t, remainingMs: t.remainingMs + 60_000, firedAt: null }
      : { ...t, endsAt: Math.max(t.endsAt, Date.now()) + 60_000, firedAt: null },
  );
}

export function dismissTimer(id: string): void {
  timersStore.set((list) => list.filter((t) => t.id !== id));
}

/** Тикает раз в interval мс, пока active. */
export function useNow(active: boolean, interval = 1000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(id);
  }, [active, interval]);
  return now;
}

/* ------------------------------------------------------------------ */
/* Сигнал: звук, вибрация, системное уведомление                       */
/* ------------------------------------------------------------------ */

let audio: AudioContext | null = null;

/** Вызывается из обработчика нажатия: браузеры разрешают звук только после жеста пользователя. */
function primeAlerts(): void {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
  } catch {
    audio = null;
  }
  if ('Notification' in window && Notification.permission === 'default') {
    void Notification.requestPermission().catch(() => undefined);
  }
}

function beep(): void {
  if (!audio) return;
  const t0 = audio.currentTime;
  for (let i = 0; i < 3; i++) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sine';
    osc.frequency.value = i === 2 ? 1175 : 880;
    const start = t0 + i * 0.28;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
    osc.connect(gain).connect(audio.destination);
    osc.start(start);
    osc.stop(start + 0.25);
  }
}

function alertOnce(timer: KitchenTimer): void {
  beep();
  navigator.vibrate?.([250, 120, 250, 120, 500]);
  if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState === 'hidden') {
    try {
      new Notification(`Таймер: ${timer.label}`, { body: timer.source.title, tag: timer.id });
    } catch {
      // Android Chrome требует ServiceWorker для уведомлений — тогда просто звук и вибрация.
    }
  }
}

const REPEAT_MS = 6000;
const REPEAT_FOR_MS = 60_000;

/** Подключается один раз в лейауте: следит за таймерами и звенит. */
export function useTimerAlarm(): void {
  const timers = useTimers();
  const active = timers.some((t) => t.endsAt !== null);
  const now = useNow(active, 500);

  useEffect(() => {
    for (const t of timers) {
      if (t.endsAt !== null && t.firedAt === null && t.endsAt <= now) {
        update(t.id, (x) => ({ ...x, firedAt: now }));
        alertOnce(t);
      }
    }
  }, [now, timers]);

  // Повторяем сигнал, пока таймер не убрали (но не дольше минуты).
  useEffect(() => {
    const ringing = timers.filter((t) => t.firedAt !== null);
    if (ringing.length === 0) return;
    const id = window.setInterval(() => {
      const fresh = timersStore.get().filter((t) => t.firedAt !== null && Date.now() - t.firedAt < REPEAT_FOR_MS);
      if (fresh[0]) alertOnce(fresh[0]);
    }, REPEAT_MS);
    return () => window.clearInterval(id);
  }, [timers]);
}
