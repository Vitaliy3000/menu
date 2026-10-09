import { Check, Home } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { formatAmount } from '../../lib/format.ts';
import { SHOP_SECTION_ORDER, SHOP_SECTIONS } from '../../lib/labels.ts';
import type { PlanProgress } from '../../lib/progress.ts';
import type { CookPlan, PlanIngredient } from '../../types/cook-plan.gen.ts';

interface Props {
  plan: CookPlan;
  progress: PlanProgress;
  toggle: (id: string) => void;
}

export function Products({ plan, progress, toggle }: Props) {
  const [hideGot, setHideGot] = useState(false);
  const got = plan.ingredients.filter((i) => progress.got.includes(i.id)).length;
  const total = plan.ingredients.length;

  const groups = [
    ...SHOP_SECTION_ORDER.map((section) => ({
      key: section,
      title: SHOP_SECTIONS[section],
      items: plan.ingredients.filter((i) => i.section === section && !i.staple),
    })),
    { key: 'staple', title: 'Обычно есть дома', items: plan.ingredients.filter((i) => i.staple) },
  ].filter((g) => g.items.length > 0);

  return (
    <div class="products">
      <div class="products-bar">
        <div class="progress-line" aria-hidden="true">
          <span style={{ transform: `scaleX(${total ? got / total : 0})` }} />
        </div>
        <p class="num">
          Собрано <strong>{got}</strong> из {total}
        </p>
        <button type="button" class={`switch${hideGot ? ' is-on' : ''}`} role="switch" aria-checked={hideGot} onClick={() => setHideGot((v) => !v)}>
          <span class="switch-track">
            <span class="switch-thumb" />
          </span>
          Скрыть собранное
        </button>
      </div>

      <p class="muted products-hint">
        Количества — на весь день, уже под объёмы этой техкарты. Отмечайте, что купили и выставили на стол.
      </p>

      <div class="product-groups">
        {groups.map((g) => {
          const visible = hideGot ? g.items.filter((i) => !progress.got.includes(i.id)) : g.items;
          if (visible.length === 0) return null;
          return (
            <section key={g.key} class="card product-group">
              <h3 class="info-title">
                {g.key === 'staple' && <Home aria-hidden="true" />}
                {g.title}
              </h3>
              <ul>
                {visible.map((item) => (
                  <ProductRow key={item.id} item={item} checked={progress.got.includes(item.id)} onToggle={() => toggle(item.id)} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      {hideGot && got === total && <p class="empty">Всё собрано — можно начинать.</p>}
    </div>
  );
}

function ProductRow({ item, checked, onToggle }: { item: PlanIngredient; checked: boolean; onToggle: () => void }) {
  return (
    <li>
      <button type="button" class={`product${checked ? ' is-checked' : ''}`} onClick={onToggle} aria-pressed={checked}>
        <span class="check">
          <Check />
        </span>
        <span class="product-name">
          {item.name}
          {item.note && <span class="product-note">{item.note}</span>}
        </span>
        <span class="product-amount num">{formatAmount(item.amount, item.unit)}</span>
      </button>
    </li>
  );
}
