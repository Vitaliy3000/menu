import { Check, Home, ShoppingBag } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { formatAmount } from '../../lib/format.ts';
import { PURCHASE_ORDER, PURCHASES, SHOP_SECTION_ORDER, SHOP_SECTIONS } from '../../lib/labels.ts';
import { buyKey, gotCount, type Purchase, purchaseEquipment, purchaseIngredients, purchaseKeys } from '../../lib/plan.ts';
import type { PlanProgress } from '../../lib/progress.ts';
import type { CookPlan, Equipment, PlanIngredient } from '../../types/cook-plan.gen.ts';

interface Props {
  plan: CookPlan;
  progress: PlanProgress;
  toggle: (id: string) => void;
}

export function Products({ plan, progress, toggle }: Props) {
  const [hideGot, setHideGot] = useState(false);
  const [purchase, setPurchase] = useState<Purchase>(1);
  const purchases = PURCHASE_ORDER.filter((p) => purchaseIngredients(plan, p).length > 0);
  const keys = purchaseKeys(plan, purchase);
  const got = gotCount(keys, progress);
  const ingredients = purchaseIngredients(plan, purchase);
  const toBuy = purchaseEquipment(plan, purchase);
  const visibleToBuy = hideGot ? toBuy.filter((e) => !progress.got.includes(buyKey(e.id))) : toBuy;

  const groups = [
    ...SHOP_SECTION_ORDER.map((section) => ({
      key: section,
      title: SHOP_SECTIONS[section],
      items: ingredients.filter((i) => i.section === section && !i.staple),
    })),
    { key: 'staple', title: 'Обычно есть дома', items: ingredients.filter((i) => i.staple) },
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
      {purchases.length > 1 && (
        <div class="chip-row products-tabs" role="group" aria-label="Закупка">
          {purchases.map((p) => {
            const own = purchaseKeys(plan, p);
            return (
              <button key={p} class="chip" type="button" aria-pressed={purchase === p} onClick={() => setPurchase(p)}>
                {PURCHASES[p].label}
                <span class="chip-count">
                  {gotCount(own, progress)}/{own.length}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div class="products-bar">
        <div class="progress-line" aria-hidden="true">
          <span style={{ transform: `scaleX(${keys.length ? got / keys.length : 0})` }} />
        </div>
        <p class="num">
          Собрано <strong>{got}</strong> из {keys.length}
        </p>
        <button type="button" class={`switch${hideGot ? ' is-on' : ''}`} role="switch" aria-checked={hideGot} onClick={() => setHideGot((v) => !v)}>
          <span class="switch-track">
            <span class="switch-thumb" />
          </span>
          Скрыть собранное
        </button>
      </div>

      <p class="muted products-hint">{PURCHASES[purchase].hint}</p>

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
      {hideGot && got === keys.length && <p class="empty">{PURCHASES[purchase].done}</p>}
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
