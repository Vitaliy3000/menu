import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkMacros, checkPlan, checkRecipe, checkUniqueTitles, sumInUnit, validateProject, validateSources } from '../scripts/data-validation.ts';
import type { CookPlan } from '../src/types/cook-plan.gen.ts';
import type { Recipe } from '../src/types/recipe.gen.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const schemas = {
  recipeSchema: JSON.parse(await readFile(`${root}schemas/recipe.schema.json`, 'utf8')) as object,
  planSchema: JSON.parse(await readFile(`${root}schemas/cook-plan.schema.json`, 'utf8')) as object,
};

const plan = (): CookPlan => ({
  id: 'test-day',
  title: 'Тестовый день',
  summary: 'Минимальная техкарта для тестов.',
  start: '10:00',
  duration: { total: 60, active: 30 },
  conditions: { cooks: 1, kitchen: 'Плита и духовка' },
  equipment: [{ id: 'oven', name: 'Духовка', kind: 'oven' }],
  dishes: [{ id: 'soup', name: 'Суп', yield: { amount: 2, unit: 'l' }, portions: 4, packaging: [{ container: 'Банка 1 л', count: 2, storage: 'fridge', days: 3 }] }],
  ingredients: [
    { id: 'pumpkin', name: 'Тыква', amount: 1, unit: 'kg', section: 'produce' },
    { id: 'salt', name: 'Соль', amount: 1, unit: 'pack', section: 'spices', staple: true },
  ],
  steps: [
    { id: 's1', at: 0, duration: 20, title: 'Нарезать тыкву', dishes: ['soup'], uses: [{ ingredient: 'pumpkin', amount: 600, unit: 'g' }] },
    { id: 's2', at: 20, duration: 40, title: 'Запечь', passive: true, dishes: ['soup'], equipment: ['oven'], timer: { minutes: 40, label: 'Тыква' }, uses: [{ ingredient: 'salt', toTaste: true }] },
  ],
});

const file = 'data/plans/test-day.json';
const messages = (issues: { message: string }[]) => issues.map((i) => i.message).join('\n');

describe('данные проекта', () => {
  it('все рецепты и техкарты проходят проверку без ошибок и предупреждений', async () => {
    const { recipes, plans, kitchen, issues } = await validateProject(root);
    expect(messages(issues)).toBe('');
    expect(recipes.length).toBeGreaterThan(0);
    expect(plans.length).toBeGreaterThan(0);
    expect(kitchen).not.toBeNull();
  });
});

describe('JSON Schema', () => {
  const validate = (doc: unknown, kind: 'recipe' | 'plan') =>
    validateSources({
      ...schemas,
      recipeFiles: kind === 'recipe' ? [{ file: 'data/recipes/x.json', text: JSON.stringify(doc) }] : [],
      planFiles: kind === 'plan' ? [{ file, text: JSON.stringify(doc) }] : [],
    }).issues.filter((i) => i.severity === 'error');

  it('принимает минимальную техкарту', () => {
    expect(validate(plan(), 'plan')).toEqual([]);
  });

  it('не даёт техкарте сослаться на рецепт', () => {
    const errors = validate({ ...plan(), recipeId: 'borsch' }, 'plan');
    expect(messages(errors)).toContain('лишнее поле «recipeId»');
    const stepErrors = validate({ ...plan(), steps: [{ ...plan().steps[0]!, recipe: 'borsch' }] }, 'plan');
    expect(messages(stepErrors)).toContain('лишнее поле «recipe»');
  });

  it('техкарта не привязана к дате', () => {
    expect(messages(validate({ ...plan(), date: '2026-10-11' }, 'plan'))).toContain('лишнее поле «date»');
  });

  it('ловит невалидный JSON и неверные enum', () => {
    const broken = validateSources({ ...schemas, recipeFiles: [], planFiles: [{ file, text: '{ "id": ' }] });
    expect(messages(broken.issues)).toContain('Невалидный JSON');
    const badUnit = plan();
    (badUnit.ingredients[0] as { unit: string }).unit = 'grams';
    expect(messages(validate(badUnit, 'plan'))).toContain('допустимые значения');
  });

  it('требует от рецепта блок заморозки одного из двух видов', () => {
    const recipe = { freezing: { suitable: true, note: 'нет' } };
    const errors = validate(recipe, 'recipe');
    expect(errors.some((e) => e.path === '/freezing')).toBe(true);
  });
});

describe('смысловые проверки CookPlan', () => {
  it('валидная техкарта — без замечаний', () => {
    expect(checkPlan(plan(), file)).toEqual([]);
  });

  it('id должен совпадать с именем файла', () => {
    expect(messages(checkPlan(plan(), 'data/plans/other.json'))).toContain('должен совпадать с именем файла');
  });

  it('ловит ссылки на несуществующие блюда, технику и продукты', () => {
    const p = plan();
    p.steps[0] = { ...p.steps[0]!, dishes: ['stew'], equipment: ['grill'], uses: [{ ingredient: 'beet' }] };
    const text = messages(checkPlan(p, file));
    expect(text).toContain('нет блюда с id «stew»');
    expect(text).toContain('нет техники с id «grill»');
    expect(text).toContain('нет продукта с id «beet»');
  });

  it('шаги должны идти по времени и укладываться в день', () => {
    const p = plan();
    p.steps.reverse();
    p.steps[0] = { ...p.steps[0]!, duration: 90 };
    const text = messages(checkPlan(p, file));
    expect(text).toContain('по возрастанию at');
    expect(text).toContain('а весь день — 60 мин');
  });

  it('предупреждает, если по шагам расходуется больше, чем куплено', () => {
    const p = plan();
    p.steps[1] = { ...p.steps[1]!, uses: [{ ingredient: 'pumpkin', amount: 0.5, unit: 'kg' }] };
    const issues = checkPlan(p, file);
    expect(issues.every((i) => i.severity === 'warning')).toBe(true);
    expect(messages(issues)).toContain('расходуется 1.1 kg');
  });

  it('предупреждает о неиспользуемых продуктах и блюдах', () => {
    const p = plan();
    p.ingredients.push({ id: 'lime', name: 'Лайм', amount: 1, unit: 'pcs', section: 'produce' });
    p.dishes.push({ ...p.dishes[0]!, id: 'bread', name: 'Хлеб' });
    const text = messages(checkPlan(p, file));
    expect(text).toContain('«lime» не используется');
    expect(text).toContain('блюдо «bread» не упоминается');
  });
});

describe('уникальные названия техкарт', () => {
  it('повтор названия — ошибка, без учёта регистра и «ё»', () => {
    const a = { doc: { title: 'Заготовки на неделю' }, file: 'data/plans/a.json' };
    const b = { doc: { title: 'заготовки на неделю' }, file: 'data/plans/b.json' };
    const c = { doc: { title: 'Ужин на шестерых' }, file: 'data/plans/c.json' };
    expect(checkUniqueTitles([a, c])).toEqual([]);
    expect(messages(checkUniqueTitles([a, b, c]))).toContain('уже есть в data/plans/a.json');
  });
});

describe('смысловые проверки Recipe', () => {
  const base = { id: 'x', time: { active: 10, total: 20 }, ingredients: [{ items: [{ name: 'Соль' }] }], steps: [{ steps: [{ text: 'Посолить' }] }], nutrition: { kcal: 100, protein: 5, fat: 4, carbs: 11 } } as unknown as Recipe;

  it('активное время не больше полного', () => {
    expect(messages(checkRecipe({ ...base, time: { active: 30, total: 20 } }, 'data/recipes/x.json'))).toContain('больше полного');
  });

  it('калории сверяются с БЖУ', () => {
    expect(checkMacros({ kcal: 100, protein: 5, fat: 4, carbs: 11 })).toBeNull();
    expect(checkMacros({ kcal: 500, protein: 5, fat: 4, carbs: 11 })).toContain('не сходится');
  });
});

describe('sumInUnit', () => {
  it('переводит граммы, килограммы и ложки', () => {
    expect(sumInUnit([{ amount: 500, unit: 'g' }, { amount: 0.25, unit: 'kg' }], 'kg')).toBe(0.75);
    expect(sumInUnit([{ amount: 2, unit: 'tbsp' }, { amount: 1, unit: 'tsp' }], 'ml')).toBe(35);
    expect(sumInUnit([{ amount: 2, unit: 'pcs' }], 'g')).toBeNull();
  });
});
