/** Компактный блок «подпись · крупное число · подпись» слева от карточки. */
export function StatBadge({ top, value, bottom, muted = false }: { top: string; value: string; bottom: string; muted?: boolean }) {
  return (
    <span class={`stat-badge${muted ? ' is-muted' : ''}`} aria-hidden="true">
      <span class="stat-top">{top}</span>
      <span class="stat-value num">{value}</span>
      <span class="stat-bottom">{bottom}</span>
    </span>
  );
}
