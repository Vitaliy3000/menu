import { formatMonthShort, formatWeekdayShort, parseDate } from '../lib/format.ts';

export function DateBadge({ date, muted = false }: { date: string; muted?: boolean }) {
  const d = parseDate(date);
  return (
    <span class={`date-badge${muted ? ' is-muted' : ''}`} aria-hidden="true">
      <span class="date-dow">{formatWeekdayShort(d)}</span>
      <span class="date-day num">{d.getDate()}</span>
      <span class="date-mon">{formatMonthShort(d)}</span>
    </span>
  );
}
