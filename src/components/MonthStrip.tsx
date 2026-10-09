import { MONTHS_SHORT } from '../lib/format.ts';

/** Полоска из 12 месяцев: сезонные подсвечены, текущий отмечен. */
export function MonthStrip({ months }: { months: number[] }) {
  const current = new Date().getMonth() + 1;
  const all = months.length === 12;
  return (
    <ol class="months" aria-label={all ? 'Круглый год' : 'Сезон'}>
      {MONTHS_SHORT.map((label, i) => {
        const m = i + 1;
        const on = months.includes(m);
        return (
          <li
            key={m}
            class={`month${on ? ' is-on' : ''}${m === current ? ' is-now' : ''}`}
            aria-label={`${label}${on ? ' — сезон' : ''}${m === current ? ', сейчас' : ''}`}
          >
            <span class="month-bar" />
            <span class="month-label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
