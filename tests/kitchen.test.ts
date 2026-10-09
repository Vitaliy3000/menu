import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkKitchen, validateSources } from '../scripts/data-validation.ts';
import { kitchenToMarkdown } from '../src/lib/kitchen.ts';
import type { Kitchen } from '../src/types/kitchen.gen.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = async (path: string) => JSON.parse(await readFile(root + path, 'utf8')) as object;
const schemas = {
  recipeSchema: await read('schemas/recipe.schema.json'),
  planSchema: await read('schemas/cook-plan.schema.json'),
  kitchenSchema: await read('schemas/kitchen.schema.json'),
};

const kitchen = (): Kitchen => ({
  people: [
    { id: 'vitaly', name: 'Виталий', avoid: [{ item: 'Кинза', level: 'dislike', note: 'Заменять петрушкой' }] },
    { id: 'sveta', name: 'Света', avoid: [{ item: 'Киви', level: 'allergy' }], notes: ['Обед с собой'] },
  ],
  equipment: [{ id: 'oven', name: 'Духовка', kind: 'oven', spec: '60 л' }],
  consumables: [{ id: 'zip', name: 'Zip-пакеты', kind: 'bag', spec: '1 л', stock: '≈ 30 шт', freezer: true }],
  storage: [{ id: 'freezer', name: 'Морозилка', kind: 'freezer', free: '≈ 20 л' }],
  pantry: [{ title: 'Специи', items: ['Соль', 'Перец'] }],
  rules: ['Не больше 4 часов'],
});

const file = 'data/kitchen.json';
const messages = (issues: { message: string }[]) => issues.map((i) => i.message).join('\n');
const validate = (doc: unknown) =>
  validateSources({ ...schemas, recipeFiles: [], planFiles: [], kitchenFile: { file, text: JSON.stringify(doc) } }).issues.filter(
    (i) => i.file === file,
  );

describe('справочник кухни', () => {
  it('валидный справочник проходит', () => {
    expect(validate(kitchen())).toEqual([]);
  });

  it('без файла — ошибка', () => {
    const { issues } = validateSources({ ...schemas, recipeFiles: [], planFiles: [], kitchenFile: null });
    expect(messages(issues)).toContain('Нет справочника кухни');
  });

  it('схема проверяет уровни и поля', () => {
    const k = kitchen() as unknown as { people: { avoid: { level: string }[] }[]; extra?: boolean };
    k.people[0]!.avoid[0]!.level = 'hate';
    k.extra = true;
    const text = messages(validate(k));
    expect(text).toContain('допустимые значения: allergy, never, dislike');
    expect(text).toContain('лишнее поле «extra»');
  });

  it('ловит повторы', () => {
    const k = kitchen();
    k.equipment.push({ id: 'oven', name: 'Вторая духовка', kind: 'oven' });
    k.people[0]!.avoid.push({ item: 'кинза', level: 'never' });
    k.pantry.push({ title: 'Ещё', items: ['соль'] });
    const issues = checkKitchen(k, file);
    expect(messages(issues)).toContain('id «oven» повторяется');
    expect(messages(issues)).toContain('«кинза» у Виталий указан дважды');
    expect(issues.find((i) => i.message.includes('«соль» уже есть'))?.severity).toBe('warning');
  });
});

describe('текст для промпта', () => {
  it('содержит все разделы и ограничения людей', () => {
    const md = kitchenToMarkdown(kitchen(), { planSchema: 'https://x/schema.json', kitchenJson: 'https://x/kitchen.json' });
    expect(md).toContain('Формат техкарты — JSON по схеме: https://x/schema.json');
    expect(md).toContain('### Света\n- Аллергия (нельзя даже следов): Киви');
    expect(md).toContain('Кинза — заменять петрушкой');
    expect(md).toContain('- Zip-пакеты, 1 л, дома ≈ 30 шт, можно: морозилка');
    for (const heading of ['## Оборудование', '## Расходники', '## Хранение', '## Всегда есть дома', '## Правила']) {
      expect(md).toContain(heading);
    }
  });
});
