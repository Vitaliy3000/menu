/** Мелочи, общие для смысловых проверок всех видов данных. */

export function uniqueIds(
  items: { id: string }[],
  path: string,
  error: (path: string, message: string) => void,
): Set<string> {
  const ids = new Set<string>();
  items.forEach((item, i) => {
    if (ids.has(item.id)) error(`${path}/${i}/id`, `id «${item.id}» повторяется`);
    ids.add(item.id);
  });
  return ids;
}

/** Калории должны примерно сходиться с БЖУ (4/9/4 ккал на грамм). */
export function checkMacros(n: { kcal: number; protein: number; fat: number; carbs: number }): string | null {
  const fromMacros = n.protein * 4 + n.fat * 9 + n.carbs * 4;
  if (n.kcal === 0 && fromMacros === 0) return null;
  const diff = Math.abs(fromMacros - n.kcal) / Math.max(n.kcal, fromMacros);
  return diff > 0.15
    ? `калорийность ${n.kcal} ккал не сходится с БЖУ (≈ ${Math.round(fromMacros)} ккал по 4/9/4)`
    : null;
}

export const round = (n: number) => Math.round(n * 100) / 100;
