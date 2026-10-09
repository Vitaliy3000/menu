import { Check, Home, ShoppingBag } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { formatAmount } from '../../lib/format.ts';
import { SHOP_SECTION_ORDER, SHOP_SECTIONS } from '../../lib/labels.ts';
import { buyKey, gotCount, shoppingKeys } from '../../lib/plan.ts';
import type { PlanProgress } from '../../lib/progress.ts';
import type { CookPlan, Equipment, PlanIngredient } from '../../types/cook-plan.gen.ts';

interface Props {
  plan: CookPlan;
  progress: PlanProgress;
  toggle: (id: string) => void;
}

export function Products({ plan, progress, toggle }: Props) {
  const [hideGot, setHideGot] = useState(false);
  const got = gotCount(plan, progress);
  const total = shoppingKeys(plan).length;
  const toBuy = plan.equipment.filter((e) => e.buy);
  const visibleToBuy = hideGot ? toBuy.filter((e) => !progress.got.includes(buyKey(e.id))) : toBuy;

  const groups = [
    ...SHOP_SECTION_ORDER.map((section) => ({
      key: section,
      title: SHOP_SECTIONS[section],
      items: plan.ingredients.filter((i) => i.section === section && !i.staple),
    })),
    { key: 'staple', title: 'Обычно есть дома', items: plan.ingredients.filter((i) => i.staple) },
  ].filter((g) => g.items.length > 0);

  const renderGroup = (g: (typeof groups)[number]) => {
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
  };

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
        {groups.filter((g) => g.key !== 'staple').map(renderGroup)}
        {visibleToBuy.length > 0 && (
          <section class="card product-group">
            <h3 class="info-title">
              <ShoppingBag aria-hidden="true" />
              Инвентарь и расходники
            </h3>
            <ul>
              {visibleToBuy.map((item) => (
                <EquipmentRow
                  key={item.id}
                  item={item}
                  checked={progress.got.includes(buyKey(item.id))}
                  onToggle={() => toggle(buyKey(item.id))}
                />
              ))}
            </ul>
          </section>
        )}
        {groups.filter((g) => g.key === 'staple').map(renderGroup)}
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

function EquipmentRow({ item, checked, onToggle }: { item: Equipment; checked: boolean; onToggle: () => void }) {
  const note = [item.spec, item.note].filter(Boolean).join('. ');
  return (
    <li>
      <button type="button" class={`product${checked ? ' is-checked' : ''}`} onClick={onToggle} aria-pressed={checked}>
        <span class="check">
          <Check />
        </span>
        <span class="product-name">
          {item.name}
          {note && <span class="product-note">{note}</span>}
        </span>
        {item.count && <span class="product-amount num">{formatAmount(item.count, 'pcs')}</span>}
      </button>
    </li>
  );
}
