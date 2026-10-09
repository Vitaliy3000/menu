import { formatNumber } from '../lib/format.ts';

interface Macros {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

/** Доли энергии от белков, жиров и углеводов + граммы. */
export function MacroBar({ n }: { n: Macros }) {
  const parts = [
    { key: 'protein', label: 'Белки', grams: n.protein, kcal: n.protein * 4 },
    { key: 'fat', label: 'Жиры', grams: n.fat, kcal: n.fat * 9 },
    { key: 'carbs', label: 'Углеводы', grams: n.carbs, kcal: n.carbs * 4 },
  ];
  const total = parts.reduce((s, p) => s + p.kcal, 0) || 1;

  return (
    <div class="macros">
      <div class="macro-bar" aria-hidden="true">
        {parts.map((p) => (
          <span key={p.key} class={`macro-seg macro-${p.key}`} style={{ flexGrow: p.kcal / total }} />
        ))}
      </div>
      <dl class="macro-legend">
        {parts.map((p) => (
          <div key={p.key}>
            <dt>
              <span class={`macro-dot macro-${p.key}`} />
              {p.label}
            </dt>
            <dd class="num">
              {formatNumber(p.grams)}&nbsp;г <span class="faint">· {Math.round((p.kcal / total) * 100)}%</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
