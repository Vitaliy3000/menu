import { Check, Info, Lightbulb, Users } from 'lucide-preact';
import { addDays, countLabel, formatAmount, formatDayMonth, formatNumber, formatWeekdayShort } from '../../lib/format.ts';
import { EQUIPMENT_KINDS, EQUIPMENT_ORDER, STORAGE } from '../../lib/labels.ts';
import type { PlanProgress } from '../../lib/progress.ts';
import type { CookPlan, Dish, Packaging, PlanNutrition } from '../../types/cook-plan.gen.ts';
import { UsesList } from './StepParts.tsx';

interface Props {
  plan: CookPlan;
  tones: Map<string, string>;
  progress: PlanProgress;
  togglePrep: (id: string) => void;
}

export function Overview({ plan, tones, progress, togglePrep }: Props) {
  return (
    <div class="overview">
      <section>
        <h2 class="display h2 section-heading">Что получится</h2>
        <div class="dish-grid">
          {plan.dishes.map((dish) => (
            <DishCard key={dish.id} dish={dish} nutrition={dishNutrition(plan, dish)} tone={tones.get(dish.id)!} startedAt={progress.startedAt} />
          ))}
        </div>
      </section>

      {plan.beforeStart && plan.beforeStart.length > 0 && (
        <section class="section">
          <h2 class="display h2 section-heading">Заранее</h2>
          <ul class="prep-list">
            {plan.beforeStart.map((task) => {
              const done = progress.prep.includes(task.id);
              return (
                <li key={task.id}>
                  <button type="button" class={`prep-item${done ? ' is-checked' : ''}`} onClick={() => togglePrep(task.id)} aria-pressed={done}>
                    <span class="check">
                      <Check />
                    </span>
                    <span class="prep-body">
                      <span class="eyebrow">{task.when}</span>
                      <span class="prep-text">{task.text}</span>
                    </span>
                  </button>
                  {task.uses && task.uses.length > 0 && (
                    <div class="prep-uses">
                      <UsesList plan={plan} step={task} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section class="section">
        <h2 class="display h2 section-heading">Кухня и условия</h2>
        <div class="conditions">
          <div class="card card-pad conditions-card">
            <p class="conditions-kitchen">{plan.conditions.kitchen}</p>
            <p class="conditions-cooks">
              <Users aria-hidden="true" />
              {plan.conditions.cooks === 1 ? 'Готовит один человек' : `Готовят ${plan.conditions.cooks} человека`}
            </p>
            {plan.conditions.notes && plan.conditions.notes.length > 0 && (
              <ul class="bullets">
                {plan.conditions.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            )}
          </div>
          <div class="equipment-groups">
            {EQUIPMENT_ORDER.map((kind) => {
              const items = plan.equipment.filter((e) => e.kind === kind);
              if (items.length === 0) return null;
              const { label, icon: Icon } = EQUIPMENT_KINDS[kind];
              return (
                <div key={kind} class="equipment-group">
                  <h3 class="info-title">
                    <Icon aria-hidden="true" />
                    {label}
                  </h3>
                  <ul>
                    {items.map((e) => (
                      <li key={e.id}>
                        <span class="equipment-name">
                          {e.name}
                          {e.count && e.count > 1 && <span class="faint num"> × {e.count}</span>}
                          {e.buy && <span class="buy-tag">купить</span>}
                        </span>
                        {e.spec && <span class="equipment-spec">{e.spec}</span>}
                        {e.note && <span class="equipment-note">{e.note}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {plan.notes && plan.notes.length > 0 && (
        <section class="section">
          <h2 class="display h2 section-heading">Важно</h2>
          <ul class="tips">
            {plan.notes.map((n, i) => (
              <li key={i}>
                <Lightbulb aria-hidden="true" />
                <p>{n}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

interface PortionNutrition {
  /** Чья порция: имя из рациона или «На порцию», если порция одна на всех. */
  who: string;
  n: PlanNutrition;
}

/** КБЖУ блюда: по строке на порцию каждого человека из рациона, без рациона — одна из dish.nutrition. */
function dishNutrition(plan: CookPlan, dish: Dish): PortionNutrition[] {
  const portions = (plan.ration?.people ?? []).flatMap((person) => {
    const portion = person.portions.find((p) => p.dish === dish.id);
    return portion ? [{ who: person.name, n: portion }] : [];
  });
  if (portions.length > 0) return portions;
  return dish.nutrition ? [{ who: 'На порцию', n: dish.nutrition }] : [];
}

function DishCard({ dish, nutrition, tone, startedAt }: { dish: Dish; nutrition: PortionNutrition[]; tone: string; startedAt: number | null }) {
  return (
    <article class={`card dish-card tone-${tone}`}>
      <header class="dish-head">
        <span class="dish-stripe" />
        <h3 class="display dish-name">{dish.name}</h3>
        {dish.description && <p class="muted dish-desc">{dish.description}</p>}
      </header>
      <dl class="dish-stats">
        <div>
          <dt>Выход</dt>
          <dd class="num">{formatAmount(dish.yield.amount, dish.yield.unit)}</dd>
        </div>
        <div>
          <dt>Порций</dt>
          <dd class="num">{dish.portions}</dd>
        </div>
        {dish.portionSize && (
          <div>
            <dt>Порция</dt>
            <dd>{dish.portionSize}</dd>
          </div>
        )}
      </dl>
      <ul class="packaging">
        {dish.packaging.map((p, i) => (
          <PackagingRow key={i} pack={p} startedAt={startedAt} />
        ))}
      </ul>
      {(dish.reheat || nutrition.length > 0) && (
        <footer class="dish-foot">
          {dish.reheat && (
            <p>
              <Info aria-hidden="true" />
              {dish.reheat}
            </p>
          )}
          {nutrition.map(({ who, n }) => (
            <p key={who} class="faint num">
              {who}: {n.kcal} ккал · Б {formatNumber(n.protein)} · Ж {formatNumber(n.fat)} · У {formatNumber(n.carbs)}
            </p>
          ))}
        </footer>
      )}
    </article>
  );
}

function PackagingRow({ pack, startedAt }: { pack: Packaging; startedAt: number | null }) {
  const { label, icon: Icon } = STORAGE[pack.storage];
  return (
    <li class={`pack pack-${pack.storage}`}>
      <span class="pack-icon">
        <Icon aria-hidden="true" />
      </span>
      <span class="pack-body">
        <span class="pack-what">
          <span class="num">{pack.count} ×</span> {pack.container}
        </span>
        <span class="pack-where">
          {label}
          {pack.storage !== 'serve' && pack.days !== undefined && ` · ${shelfLife(pack.days, startedAt)}`}
          {pack.note && ` · ${pack.note}`}
        </span>
      </span>
    </li>
  );
}

/** Срок хранения: после старта готовки — конкретная дата, до него — длительность. */
function shelfLife(days: number, startedAt: number | null): string {
  if (days > 45) return countLabel(Math.round(days / 30), ['месяц', 'месяца', 'месяцев']);
  if (!startedAt) return countLabel(days, ['день', 'дня', 'дней']);
  const until = addDays(new Date(startedAt), days);
  return `до ${formatWeekdayShort(until)}, ${formatDayMonth(until)}`;
}
