import { useState } from 'preact/hooks';
import { useWakeLock, wakeLockSupported } from '../lib/wakeLock.ts';

/** Переключатель «не гасить экран» над шагами. */
export function WakeLockToggle() {
  const [on, setOn] = useState(false);
  const active = useWakeLock(on);
  if (!wakeLockSupported) return null;
  return (
    <button type="button" class={`switch${on ? ' is-on' : ''}`} role="switch" aria-checked={on} onClick={() => setOn((v) => !v)}>
      <span class="switch-track">
        <span class="switch-thumb" />
      </span>
      {on && active ? 'Экран не гаснет' : 'Не гасить экран'}
    </button>
  );
}
