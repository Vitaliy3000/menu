/** Справочник кухни: подписи. */
import { Archive, Refrigerator, Snowflake, type LucideIcon } from 'lucide-preact';
import type { AvoidLevel, StorageKind } from '../types/kitchen.gen.ts';

export const AVOID_LEVELS: Record<AvoidLevel, { label: string; hint: string }> = {
  allergy: { label: 'Аллергия', hint: 'нельзя даже следов' },
  never: { label: 'Не ест', hint: 'не использовать' },
  dislike: { label: 'Не любит', hint: 'лучше обойтись или подать отдельно' },
};

export const AVOID_ORDER: AvoidLevel[] = ['allergy', 'never', 'dislike'];

export const STORAGE_PLACES: Record<StorageKind, { label: string; icon: LucideIcon }> = {
  fridge: { label: 'Холодильник', icon: Refrigerator },
  freezer: { label: 'Морозилка', icon: Snowflake },
  pantry: { label: 'Шкаф', icon: Archive },
};
