/** Не даёт экрану погаснуть, пока enabled. Браузер снимает блокировку при сворачивании — восстанавливаем. */
import { useEffect, useState } from 'preact/hooks';

export const wakeLockSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

export function useWakeLock(enabled: boolean): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!enabled || !wakeLockSupported) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== 'visible' || (sentinel && !sentinel.released)) return;
      try {
        sentinel = await navigator.wakeLock.request('screen');
        if (cancelled) {
          void sentinel.release();
          return;
        }
        setActive(true);
        sentinel.addEventListener('release', () => setActive(false));
      } catch {
        setActive(false);
      }
    };

    void acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', acquire);
      void sentinel?.release();
      setActive(false);
    };
  }, [enabled]);

  return active;
}
