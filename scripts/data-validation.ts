/**
 * Проверка данных сайта: JSON Schema + смысловые проверки, которые схема выразить не может
 * (уникальность id, ссылки внутри техкарты, порядок таймлайна, согласованность чисел).
 *
 * Используется в трёх местах: CLI (npm run validate), Vite-плагин (сборка и dev-сервер) и тесты.
 */
import { readdir, readFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { Recipe } from '../src/types/recipe.gen.ts';
import type { CookPlan, IngredientUse, Unit } from '../src/types/cook-plan.gen.ts';

export type Severity = 'error' | 'warning';

export interface Issue {
  severity: Severity;
  /** Путь к файлу относительно корня проекта. */
  file: string;
  /** JSON Pointer внутри документа, например /steps/3/timer. */
  path: string;
  message: string;
}

export interface DataSet {
  recipes: Recipe[];
  plans: CookPlan[];
  issues: Issue[];
}

export interface SourceFile {
  /** Путь относительно корня проекта — только для сообщений. */
  file: string;
  text: string;
}

export const DATA_DIRS = {
  recipes: 'data/recipes',
  plans: 'data/plans',
} as const;

export const SCHEMA_FILES = {
  recipes: 'schemas/recipe.schema.json',
  plans: 'schemas/cook-plan.schema.json',
} as const;

type Kind = keyof typeof DATA_DIRS;

/* ------------------------------------------------------------------ */
/* Загрузка с диска                                                    */
/* ------------------------------------------------------------------ */

export async function validateProject(root: string): Promise<DataSet> {
  const [recipeSchema, planSchema] = await Promise.all([
    readJson(join(root, SCHEMA_FILES.recipes)),
    readJson(join(root, SCHEMA_FILES.plans)),
  ]);
  const [recipeFiles, planFiles] = await Promise.all([
    readSources(root, DATA_DIRS.recipes),
    readSources(root, DATA_DIRS.plans),
  ]);
  return validateSources({ recipeSchema, planSchema, recipeFiles, planFiles });
}

async function readJson(path: string): Promise<object> {
  return JSON.parse(await readFile(path, 'utf8')) as object;
}

async function readSources(root: string, dir: string): Promise<SourceFile[]> {
  const abs = join(root, dir);
  const names = (await readdir(abs).catch(() => [] as string[])).filter((n) => n.endsWith('.json')).sort();
  return Promise.all(
    names.map(async (name) => ({
      file: relative(root, join(abs, name)),
      text: await readFile(join(abs, name), 'utf8'),
    })),
  );
}

/* ------------------------------------------------------------------ */
/* Проверка                                                            */
/* ------------------------------------------------------------------ */

export function validateSources(input: {
  recipeSchema: object;
  planSchema: object;
  recipeFiles: SourceFile[];
  planFiles: SourceFile[];
}): DataSet {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validateRecipe = ajv.compile<Recipe>(input.recipeSchema);
  const validatePlan = ajv.compile<CookPlan>(input.planSchema);

  const issues: Issue[] = [];
  const recipes = parseAll('recipes', input.recipeFiles, validateRecipe, issues);
  const plans = parseAll('plans', input.planFiles, validatePlan, issues);

  for (const { doc, file } of recipes) issues.push(...checkRecipe(doc, file));
  for (const { doc, file } of plans) issues.push(...checkPlan(doc, file));

  return {
    recipes: recipes.map((r) => r.doc),
    plans: plans.map((p) => p.doc),
    issues,
  };
}

function parseAll<T>(
  kind: Kind,
  files: SourceFile[],
  validate: ValidateFunction<T>,
  issues: Issue[],
): { doc: T; file: string }[] {
  const ok: { doc: T; file: string }[] = [];
  for (const { file, text } of files) {
    let doc: unknown;
    try {
      doc = JSON.parse(text);
    } catch (e) {
      issues.push({ severity: 'error', file, path: '', message: `Невалидный JSON: ${(e as Error).message}` });
      continue;
    }
    if (!validate(doc)) {
      for (const err of compactErrors(validate.errors ?? [])) {
        issues.push({ severity: 'error', file, path: err.instancePath, message: describeAjvError(err) });
      }
      continue;
    }
    ok.push({ doc, file });
  }
  if (files.length === 0) {
    issues.push({ severity: 'warning', file: DATA_DIRS[kind], path: '', message: 'Нет ни одного файла' });
  }
  return ok;
}

/** Убирает дубли и шум oneOf: оставляем ошибки самой «глубокой» ветки. */
function compactErrors(errors: ErrorObject[]): ErrorObject[] {
  const seen = new Set<string>();
  return errors.filter((e) => {
    if (e.keyword === 'oneOf' && errors.some((o) => o !== e && o.instancePath.startsWith(e.instancePath))) {
      return false;
    }
    const key = `${e.instancePath}|${e.message}|${JSON.stringify(e.params)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function describeAjvError(e: ErrorObject): string {
  switch (e.keyword) {
    case 'additionalProperties':
      return `лишнее поле «${String(e.params.additionalProperty)}»`;
    case 'required':
      return `нет обязательного поля «${String(e.params.missingProperty)}»`;
    case 'enum':
      return `допустимые значения: ${(e.params.allowedValues as unknown[]).join(', ')}`;
    case 'const':
      return `ожидается ${JSON.stringify(e.params.allowedValue)}`;
    default:
      return e.message ?? e.keyword;
  }
}

/* ------------------------------------------------------------------ */
/* Смысловые проверки: Recipe                                          */
/* ------------------------------------------------------------------ */

export function checkRecipe(r: Recipe, file: string): Issue[] {
  const issues: Issue[] = [];
  const error = (path: string, message: string) => issues.push({ severity: 'error', file, path, message });
  const warn = (path: string, message: string) => issues.push({ severity: 'warning', file, path, message });

  const expectedId = basename(file, '.json');
  if (r.id !== expectedId) error('/id', `id «${r.id}» должен совпадать с именем файла «${expectedId}»`);

  if (r.time.active > r.time.total) {
    error('/time', `активное время (${r.time.active}) больше полного (${r.time.total})`);
  }

  r.ingredients.forEach((group, g) =>
    group.items.forEach((item, i) => {
      const path = `/ingredients/${g}/items/${i}`;
      if (item.amountMax !== undefined && item.amount !== undefined && item.amountMax <= item.amount) {
        error(path, `amountMax (${item.amountMax}) должен быть больше amount (${item.amount})`);
      }
      if (item.toTaste && item.amount !== undefined) {
        warn(path, `«${item.name}»: одновременно toTaste и amount`);
      }
    }),
  );

  if (r.ingredients.length > 1 && r.ingredients.some((g) => !g.title)) {
    warn('/ingredients', 'если групп ингредиентов несколько, у каждой должно быть название');
  }
  if (r.steps.length > 1 && r.steps.some((g) => !g.title)) {
    warn('/steps', 'если этапов несколько, у каждого должно быть название');
  }

  const kcalIssue = checkMacros(r.nutrition);
  if (kcalIssue) warn('/nutrition', kcalIssue);

  return issues;
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

/* ------------------------------------------------------------------ */
/* Смысловые проверки: CookPlan                                        */
/* ------------------------------------------------------------------ */

export function checkPlan(p: CookPlan, file: string): Issue[] {
  const issues: Issue[] = [];
  const error = (path: string, message: string) => issues.push({ severity: 'error', file, path, message });
  const warn = (path: string, message: string) => issues.push({ severity: 'warning', file, path, message });

  const expectedId = basename(file, '.json');
  if (p.id !== expectedId) error('/id', `id «${p.id}» должен совпадать с именем файла «${expectedId}»`);

  if (p.duration.active > p.duration.total) {
    error('/duration', `активное время (${p.duration.active}) больше полного (${p.duration.total})`);
  }

  const equipment = uniqueIds(p.equipment, '/equipment', error);
  const dishes = uniqueIds(p.dishes, '/dishes', error);
  const ingredients = uniqueIds(p.ingredients, '/ingredients', error);
  uniqueIds(p.steps, '/steps', error);
  uniqueIds(p.beforeStart ?? [], '/beforeStart', error);

  const usedDishes = new Set<string>();
  const usedIngredients = new Map<string, { amount: number; unit: Unit }[] | 'whole'>();

  const trackUse = (use: IngredientUse, path: string) => {
    if (!ingredients.has(use.ingredient)) {
      error(path, `нет продукта с id «${use.ingredient}»`);
      return;
    }
    if (use.toTaste) {
      if (use.amount !== undefined) error(path, 'одновременно toTaste и amount');
      if (!usedIngredients.has(use.ingredient)) usedIngredients.set(use.ingredient, []);
      return;
    }
    const acc = usedIngredients.get(use.ingredient) ?? [];
    if (use.amount === undefined || use.unit === undefined || acc === 'whole') {
      usedIngredients.set(use.ingredient, 'whole');
    } else {
      acc.push({ amount: use.amount, unit: use.unit });
      usedIngredients.set(use.ingredient, acc);
    }
  };

  p.beforeStart?.forEach((task, i) => task.uses?.forEach((use, j) => trackUse(use, `/beforeStart/${i}/uses/${j}`)));

  p.steps.forEach((step, i) => {
    const path = `/steps/${i}`;
    const prev = p.steps[i - 1];
    if (prev && step.at < prev.at) {
      error(`${path}/at`, `шаги должны идти по возрастанию at: «${step.id}» (${step.at}) после «${prev.id}» (${prev.at})`);
    }
    const end = step.at + step.duration;
    if (end > p.duration.total) {
      error(`${path}/duration`, `шаг «${step.id}» заканчивается на ${end}-й минуте, а весь день — ${p.duration.total} мин`);
    }

    step.dishes?.forEach((id, j) => {
      usedDishes.add(id);
      if (!dishes.has(id)) error(`${path}/dishes/${j}`, `нет блюда с id «${id}»`);
    });
    step.equipment?.forEach((id, j) => {
      if (!equipment.has(id)) error(`${path}/equipment/${j}`, `нет техники с id «${id}»`);
    });
    step.uses?.forEach((use, j) => trackUse(use, `${path}/uses/${j}`));
  });

  p.dishes.forEach((dish, i) => {
    if (!usedDishes.has(dish.id)) warn(`/dishes/${i}`, `блюдо «${dish.id}» не упоминается ни в одном шаге`);
  });

  p.ingredients.forEach((ing, i) => {
    const uses = usedIngredients.get(ing.id);
    if (!uses) {
      warn(`/ingredients/${i}`, `продукт «${ing.id}» не используется ни в одном шаге и ни в одной задаче beforeStart`);
      return;
    }
    if (uses === 'whole') return;
    const total = sumInUnit(uses, ing.unit);
    if (total !== null && total > ing.amount * 1.001) {
      warn(`/ingredients/${i}`, `по шагам расходуется ${round(total)} ${ing.unit} «${ing.id}», а в закупке ${ing.amount} ${ing.unit}`);
    }
  });

  return issues;
}

function uniqueIds(
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

const BASE_UNIT: Partial<Record<Unit, [Unit, number]>> = {
  g: ['g', 1],
  kg: ['g', 1000],
  ml: ['ml', 1],
  l: ['ml', 1000],
  tsp: ['ml', 5],
  tbsp: ['ml', 15],
};

/** Сумма количеств в единицах target; null, если единицы несопоставимы. */
export function sumInUnit(items: { amount: number; unit: Unit }[], target: Unit): number | null {
  const [targetBase, targetFactor] = BASE_UNIT[target] ?? [target, 1];
  let sum = 0;
  for (const { amount, unit } of items) {
    const [base, factor] = BASE_UNIT[unit] ?? [unit, 1];
    if (base !== targetBase) return null;
    sum += amount * factor;
  }
  return sum / targetFactor;
}

const round = (n: number) => Math.round(n * 100) / 100;

/* ------------------------------------------------------------------ */
/* Отчёт                                                               */
/* ------------------------------------------------------------------ */

export function formatIssue(i: Issue): string {
  const where = i.path ? `${i.file} → ${i.path}` : i.file;
  return `${i.severity === 'error' ? '✗' : '!'} ${where}: ${i.message}`;
}
