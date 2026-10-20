import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkKitchen, validateSources } from '../scripts/data-validation.ts';
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
    { id: 'sveta', name: 'Света', avoid: [{ item: 'Киви', level: 'allergy' }] },
  ],
  equipment: [{ id: 'oven', name: 'Духовка', kind: 'oven', spec: '60 л' }],
  storage: [{ id: 'freezer', name: 'Морозилка', kind: 'freezer', free: '≈ 20 л' }],
  surplus: [{ item: 'Рис для суши', amount: '6 кг' }],
  products: {
    rules: ['Фарш — только био'],
    choose: [{ item: 'Сухая паста', pick: 'De Cecco' }],
    avoid: [{ item: 'Курица AH Scharrel', note: 'Beter Leven 1 ster' }],
  },
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
    k.surplus!.push({ item: 'рис для суши', amount: '1 кг' });
    k.products!.choose.push({ item: 'сухая паста', pick: 'Rummo' });
    k.products!.avoid.push({ item: 'Курица AH scharrel' });
    const issues = checkKitchen(k, file);
    expect(messages(issues)).toContain('id «oven» повторяется');
    expect(messages(issues)).toContain('«кинза» у Виталий указан дважды');
    expect(messages(issues)).toContain('«рис для суши» в излишках указан дважды');
    expect(messages(issues)).toContain('«сухая паста» в «Выбираем» указан дважды');
    expect(messages(issues)).toContain('«Курица AH scharrel» в «Избегаем» указан дважды');
  });
});
