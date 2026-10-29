/** Вкусовой профиль ссылается только на словари и позиции каталога продуктов. */
import { basename } from 'node:path';
import { AROMA_NOTES, CUISINES } from '../src/lib/flavor.ts';
import type { TasteProfile } from '../src/types/taste-profile.gen.ts';
import type { Issue } from './data-validation.ts';

export function checkTasteProfile(p: TasteProfile, file: string, foodIds: Set<string>): Issue[] {
  const issues: Issue[] = [];
  const error = (path: string, message: string) => issues.push({ severity: 'error', file, path, message });

  const expectedId = basename(file, '.json');
  if (p.id !== expectedId) error('/id', `id «${p.id}» должен совпадать с именем файла «${expectedId}»`);

  const vocabularies = [
    { key: 'aroma', known: (k: string) => k in AROMA_NOTES, what: 'нота аромата' },
    { key: 'cuisines', known: (k: string) => k in CUISINES, what: 'кухня' },
    { key: 'foods', known: (k: string) => foodIds.has(k), what: 'позиция каталога' },
  ] as const;
  for (const { key, known, what } of vocabularies) {
    for (const k of Object.keys(p[key])) if (!known(k)) error(`/${key}/${k}`, `неизвестная ${what} «${k}»`);
    for (const k of Object.keys(p.untried[key])) {
      if (!known(k)) error(`/untried/${key}/${k}`, `неизвестная ${what} «${k}»`);
      else if (k in p[key]) error(`/untried/${key}/${k}`, `«${k}» уже оценена в ${key}`);
    }
  }
  return issues;
}
