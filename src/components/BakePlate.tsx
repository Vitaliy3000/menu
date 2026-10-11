import { BAKE_KINDS } from '../lib/labels.ts';
import type { BakeKind } from '../types/bake.gen.ts';

/** «Тарелка» выпечки: иконка группы каталога. Без size размер задаёт CSS (--size). */
export function BakePlate({ kind, size }: { kind: BakeKind; size?: number }) {
  const { icon: Icon, tone } = BAKE_KINDS[kind];
  return (
    <span class={`plate tone-${tone}`} style={size ? { '--size': `${size}px` } : undefined} aria-hidden="true">
      <Icon />
    </span>
  );
}
