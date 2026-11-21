import type { ComponentChildren } from 'preact';
import { setQuery } from '../lib/router.tsx';

export interface VariantTab {
  id: string;
  label: ComponentChildren;
}

/** Табы вариантов страницы: выбранный — в query-параметре, у первого параметра нет. */
export function VariantTabs({
  label,
  param,
  tabs,
  active,
  note,
}: {
  label: string;
  param: string;
  tabs: VariantTab[];
  active: string;
  note?: string;
}) {
  return (
    <div class="variant-tabs">
      <div class="tabs" role="tablist" aria-label={label}>
        {tabs.map((t, i) => (
          <button key={t.id} type="button" role="tab" aria-selected={t.id === active} onClick={() => setQuery({ [param]: i === 0 ? null : t.id })}>
            {t.label}
          </button>
        ))}
      </div>
      {note && <p class="muted">{note}</p>}
    </div>
  );
}
