/** Справочник кухни: подписи и экспорт в текст для промпта. */
import { Archive, Box, Package, Refrigerator, ScrollText, Snowflake, Tag, type LucideIcon } from 'lucide-preact';
import type { AvoidLevel, ConsumableKind, Kitchen, StorageKind } from '../types/kitchen.gen.ts';
import { EQUIPMENT_KINDS, EQUIPMENT_ORDER } from './labels.ts';

export const AVOID_LEVELS: Record<AvoidLevel, { label: string; hint: string }> = {
  allergy: { label: 'Аллергия', hint: 'нельзя даже следов' },
  never: { label: 'Не ест', hint: 'не использовать' },
  dislike: { label: 'Не любит', hint: 'лучше обойтись или подать отдельно' },
};

export const AVOID_ORDER: AvoidLevel[] = ['allergy', 'never', 'dislike'];

export const CONSUMABLE_KINDS: Record<ConsumableKind, { label: string; icon: LucideIcon }> = {
  container: { label: 'Контейнеры и формы', icon: Box },
  bag: { label: 'Пакеты', icon: Package },
  wrap: { label: 'Фольга, плёнка, пергамент', icon: ScrollText },
  label: { label: 'Маркировка', icon: Tag },
  other: { label: 'Прочее', icon: Package },
};

export const CONSUMABLE_ORDER: ConsumableKind[] = ['container', 'bag', 'wrap', 'label', 'other'];

export const STORAGE_PLACES: Record<StorageKind, { label: string; icon: LucideIcon }> = {
  fridge: { label: 'Холодильник', icon: Refrigerator },
  freezer: { label: 'Морозилка', icon: Snowflake },
  pantry: { label: 'Шкаф', icon: Archive },
};

const join = (parts: (string | undefined | false)[]) => parts.filter(Boolean).join(', ');
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const nb = (s: string) => s.replace(/ /g, ' ');

/**
 * Справочник одним текстом в Markdown — чтобы вставить в промпт при составлении техкарты.
 * links — абсолютные адреса схемы техкарты и JSON справочника.
 */
export function kitchenToMarkdown(k: Kitchen, links?: { planSchema: string; kitchenJson: string }): string {
  const out: string[] = ['# Кухня — контекст для составления техкарт', ''];

  if (links) {
    out.push(`Формат техкарты — JSON по схеме: ${links.planSchema}`, `Этот справочник в JSON: ${links.kitchenJson}`, '');
  }

  out.push('## Кто что не ест');
  for (const person of k.people) {
    out.push(`### ${person.name}`);
    for (const level of AVOID_ORDER) {
      const items = person.avoid.filter((a) => a.level === level);
      if (items.length === 0) continue;
      out.push(`- ${AVOID_LEVELS[level].label} (${AVOID_LEVELS[level].hint}): ${items.map((a) => (a.note ? `${a.item} — ${lowerFirst(a.note)}` : a.item)).join('; ')}`);
    }
    for (const note of person.notes ?? []) out.push(`- ${note}`);
    out.push('');
  }

  out.push('## Оборудование');
  for (const kind of EQUIPMENT_ORDER) {
    const items = k.equipment.filter((e) => e.kind === kind);
    if (items.length === 0) continue;
    out.push(`- ${EQUIPMENT_KINDS[kind].label}: ${items.map((e) => join([`${e.name}${e.count && e.count > 1 ? ` × ${e.count}` : ''}`, e.spec, e.note])).join('; ')}`);
  }
  out.push('');

  out.push('## Расходники');
  for (const c of k.consumables) {
    const flags = join([c.freezer && 'морозилка', c.microwave && 'СВЧ', c.oven && 'духовка']);
    out.push(`- ${join([c.name, c.spec, c.stock && `дома ${c.stock}`, flags && `можно: ${flags}`, c.note])}`);
  }
  out.push('');

  out.push('## Хранение');
  for (const s of k.storage) out.push(`- ${join([s.name, s.capacity, s.free && `свободно: ${s.free}`, s.note])}`);
  out.push('');

  out.push('## Всегда есть дома (в закупку не включать, staple)');
  for (const g of k.pantry) out.push(`- ${g.title}: ${g.items.join(', ')}`);
  out.push('');

  out.push('## Правила');
  for (const rule of k.rules) out.push(`- ${rule}`);

  return nb(out.join('\n')).trim() + '\n';
}
