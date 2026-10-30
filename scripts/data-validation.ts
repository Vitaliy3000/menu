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
import type { CookPlan, IngredientUse, Ration, Unit } from '../src/types/cook-plan.gen.ts';
import { deviation, personDay } from '../src/lib/ration.ts';
import { ZONE_LABELS, zoneConflicts } from '../src/lib/zones.ts';
import { equipmentOveruse } from './equipment-use.ts';
import { idleGaps, stageConflicts } from './role-flow.ts';
import { checkTasteDeck } from './taste-deck-check.ts';
import { checkTasteProfile } from './taste-profile-check.ts';
import type { Kitchen } from '../src/types/kitchen.gen.ts';
import type { Bake } from '../src/types/bake.gen.ts';
import type { Baking } from '../src/types/baking.gen.ts';
import type { Foods } from '../src/types/foods.gen.ts';
import type { TasteDeck } from '../src/types/taste-deck.gen.ts';
import type { TasteProfile } from '../src/types/taste-profile.gen.ts';
import { doughGrams, expectedDough, flourGrams, inFinal } from '../src/lib/baking.ts';

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
  kitchen: Kitchen | null;
  bakes: Bake[];
  baking: Baking | null;
  foods: Foods | null;
  tasteProfiles: TasteProfile[];
  tasteDeck: TasteDeck | null;
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
  bakes: 'data/bakes',
  tasteProfiles: 'data/taste-profiles',
} as const;

export const SCHEMA_FILES = {
  recipes: 'schemas/recipe.schema.json',
  plans: 'schemas/cook-plan.schema.json',
  kitchen: 'schemas/kitchen.schema.json',
  bakes: 'schemas/bake.schema.json',
  baking: 'schemas/baking.schema.json',
  foods: 'schemas/foods.schema.json',
  tasteProfiles: 'schemas/taste-profile.schema.json',
  tasteDeck: 'schemas/taste-deck.schema.json',
} as const;

/** Справочник кухни — один файл. */
export const KITCHEN_FILE = 'data/kitchen.json';
/** Справочник выпечки — один файл. */
export const BAKING_FILE = 'data/baking.json';
/** Каталог продуктов и блюд — один файл. */
export const FOODS_FILE = 'data/foods.json';
/** Колода анкеты «Вкусовой профиль» — один файл. */
export const TASTE_DECK_FILE = 'data/taste-deck.json';

type Kind = keyof typeof DATA_DIRS;

/* ------------------------------------------------------------------ */
/* Загрузка с диска                                                    */
/* ------------------------------------------------------------------ */

export async function validateProject(root: string): Promise<DataSet> {
  const [recipeSchema, planSchema, kitchenSchema, bakeSchema, bakingSchema, foodsSchema, tasteProfileSchema, tasteDeckSchema] = await Promise.all([
    readJson(join(root, SCHEMA_FILES.recipes)),
    readJson(join(root, SCHEMA_FILES.plans)),
    readJson(join(root, SCHEMA_FILES.kitchen)),
    readJson(join(root, SCHEMA_FILES.bakes)),
    readJson(join(root, SCHEMA_FILES.baking)),
    readJson(join(root, SCHEMA_FILES.foods)),
    readJson(join(root, SCHEMA_FILES.tasteProfiles)),
    readJson(join(root, SCHEMA_FILES.tasteDeck)),
  ]);
  const [recipeFiles, planFiles, bakeFiles, tasteProfileFiles, kitchenFile, bakingFile, foodsFile, tasteDeckFile] = await Promise.all([
    readSources(root, DATA_DIRS.recipes),
    readSources(root, DATA_DIRS.plans),
    readSources(root, DATA_DIRS.bakes),
    readSources(root, DATA_DIRS.tasteProfiles),
    readSource(root, KITCHEN_FILE),
    readSource(root, BAKING_FILE),
    readSource(root, FOODS_FILE),
    readSource(root, TASTE_DECK_FILE),
  ]);
  return validateSources({
    recipeSchema,
    planSchema,
    kitchenSchema,
    bakeSchema,
    bakingSchema,
    recipeFiles,
    planFiles,
    bakeFiles,
    kitchenFile,
    bakingFile,
    foodsSchema,
    foodsFile,
    tasteProfileSchema,
    tasteProfileFiles,
    tasteDeckSchema,
    tasteDeckFile,
  });
}

async function readSource(root: string, file: string): Promise<SourceFile | null> {
  const text = await readFile(join(root, file), 'utf8').catch(() => null);
  return text === null ? null : { file, text };
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
  /** Без схемы справочник не проверяется (удобно в тестах рецептов и техкарт). */
  kitchenSchema?: object;
  /** null — файла нет. */
  kitchenFile?: SourceFile | null;
  /** Без схемы рецептуры выпечки не проверяются. */
  bakeSchema?: object;
  bakeFiles?: SourceFile[];
  /** Без схемы справочник выпечки не проверяется. */
  bakingSchema?: object;
  /** null — файла нет. */
  bakingFile?: SourceFile | null;
  /** Без схемы каталог продуктов не проверяется. */
  foodsSchema?: object;
  /** null — файла нет. */
  foodsFile?: SourceFile | null;
  /** Без схемы или без каталога продуктов вкусовые профили не проверяются. */
  tasteProfileSchema?: object;
  tasteProfileFiles?: SourceFile[];
  /** Без схемы или без каталога продуктов колода анкеты не проверяется. */
  tasteDeckSchema?: object;
  /** null — файла нет. */
  tasteDeckFile?: SourceFile | null;
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
  issues.push(...checkUniqueTitles(plans));

  const kitchen = input.kitchenSchema
    ? parseReference(ajv.compile<Kitchen>(input.kitchenSchema), input.kitchenFile, KITCHEN_FILE, 'Нет справочника кухни', checkKitchen, issues)
    : null;

  let bakes: { doc: Bake; file: string }[] = [];
  if (input.bakeSchema) {
    bakes = parseAll('bakes', input.bakeFiles ?? [], ajv.compile<Bake>(input.bakeSchema), issues);
    for (const { doc, file } of bakes) issues.push(...checkBake(doc, file));
    issues.push(...checkUniqueTitles(bakes));
  }
  const baking = input.bakingSchema
    ? parseReference(ajv.compile<Baking>(input.bakingSchema), input.bakingFile, BAKING_FILE, 'Нет справочника выпечки', checkBaking, issues)
    : null;
  const foods = input.foodsSchema
    ? parseReference(ajv.compile<Foods>(input.foodsSchema), input.foodsFile, FOODS_FILE, 'Нет каталога продуктов', checkFoods, issues)
    : null;

  let tasteProfiles: { doc: TasteProfile; file: string }[] = [];
  let tasteDeck: TasteDeck | null = null;
  if (foods) {
    const foodIds = new Set(foods.groups.flatMap((g) => g.items.map((f) => f.id)));
    if (input.tasteProfileSchema) {
      tasteProfiles = parseAll('tasteProfiles', input.tasteProfileFiles ?? [], ajv.compile<TasteProfile>(input.tasteProfileSchema), issues);
      for (const { doc, file } of tasteProfiles) issues.push(...checkTasteProfile(doc, file, foodIds));
    }
    if (input.tasteDeckSchema) {
      const check = (doc: TasteDeck, file: string) => checkTasteDeck(doc, file, foodIds);
      tasteDeck = parseReference(ajv.compile<TasteDeck>(input.tasteDeckSchema), input.tasteDeckFile, TASTE_DECK_FILE, 'Нет колоды анкеты', check, issues);
    }
  }

  return {
    recipes: recipes.map((r) => r.doc),
    plans: plans.map((p) => p.doc),
    kitchen,
    bakes: bakes.map((b) => b.doc),
    baking,
    foods,
    tasteProfiles: tasteProfiles.map((p) => p.doc),
    tasteDeck,
    issues,
  };
}

/** Справочник из одного файла: нет файла — ошибка, иначе схема и смысловые проверки. */
function parseReference<T>(
  validate: ValidateFunction<T>,
  source: SourceFile | null | undefined,
  file: string,
  missing: string,
  check: (doc: T, file: string) => Issue[],
  issues: Issue[],
): T | null {
  if (!source) {
    issues.push({ severity: 'error', file, path: '', message: missing });
    return null;
  }
  const [parsed] = parseFiles([source], validate, issues);
  if (!parsed) return null;
  issues.push(...check(parsed.doc, parsed.file));
  return parsed.doc;
}

function parseAll<T>(
  kind: Kind,
  files: SourceFile[],
  validate: ValidateFunction<T>,
  issues: Issue[],
): { doc: T; file: string }[] {
  if (files.length === 0) {
    issues.push({ severity: 'warning', file: DATA_DIRS[kind], path: '', message: 'Нет ни одного файла' });
  }
  return parseFiles(files, validate, issues);
}

function parseFiles<T>(files: SourceFile[], validate: ValidateFunction<T>, issues: Issue[]): { doc: T; file: string }[] {
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

/** Названия техкарт уникальны (без учёта регистра и «ё»): по ним техкарты различают на сайте. */
export function checkUniqueTitles(docs: { doc: { title: string }; file: string }[]): Issue[] {
  const seen = new Map<string, string>();
  const issues: Issue[] = [];
  for (const { doc, file } of docs) {
    const key = doc.title.trim().toLowerCase().replace(/ё/g, 'е');
    const other = seen.get(key);
    if (other) issues.push({ severity: 'error', file, path: '/title', message: `название «${doc.title}» уже есть в ${other}` });
    else seen.set(key, file);
  }
  return issues;
}

/* ------------------------------------------------------------------ */
/* Смысловые проверки: справочник кухни                                */
/* ------------------------------------------------------------------ */

export function checkKitchen(k: Kitchen, file: string): Issue[] {
  const issues: Issue[] = [];
  const error = (path: string, message: string) => issues.push({ severity: 'error', file, path, message });

  uniqueIds(k.people, '/people', error);
  uniqueIds(k.equipment, '/equipment', error);
  uniqueIds(k.storage, '/storage', error);

  k.people.forEach((person, i) => uniqueItems(person.avoid, `/people/${i}/avoid`, `у ${person.name}`, error));
  uniqueItems(k.surplus ?? [], '/surplus', 'в излишках', error);
  if (k.products) {
    uniqueItems(k.products.choose, '/products/choose', 'в «Выбираем»', error);
    uniqueItems(k.products.avoid, '/products/avoid', 'в «Избегаем»', error);
  }

  return issues;
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
/* Смысловые проверки: выпечка                                         */
/* ------------------------------------------------------------------ */

/** Допуск между весом теста и загрузкой формы (г/л × объём). */
const PAN_LOAD_TOLERANCE = 0.03;

export function checkBake(b: Bake, file: string): Issue[] {
  const issues: Issue[] = [];
  const error = (path: string, message: string) => issues.push({ severity: 'error', file, path, message });
  const warn = (path: string, message: string) => issues.push({ severity: 'warning', file, path, message });
  const norm = (s: string) => s.trim().toLowerCase().replace(/ё/g, 'е');

  const expectedId = basename(file, '.json');
  if (b.id !== expectedId) error('/id', `id «${b.id}» должен совпадать с именем файла «${expectedId}»`);

  const methodIds = uniqueIds(b.methods, '/methods', error);
  if (b.methods.length > 1) {
    b.methods.forEach((m, i) => {
      if (!m.title) error(`/methods/${i}`, `у способа «${m.id}» нет названия — оно нужно, когда способов несколько`);
    });
  }

  b.methods.forEach((m, mi) => {
    const base = `/methods/${mi}`;
    const f = m.formula;
    const partIds = uniqueIds(f.parts ?? [], `${base}/formula/parts`, error);
    const usedParts = new Set<string>();
    const names = new Set<string>();

    f.ingredients.forEach((ing, ii) => {
      const path = `${base}/formula/ingredients/${ii}`;
      if (names.has(norm(ing.name))) error(path, `«${ing.name}» в формуле указан дважды`);
      names.add(norm(ing.name));
      for (const part of Object.keys(ing.parts ?? {})) {
        if (!partIds.has(part)) error(`${path}/parts/${part}`, `нет части «${part}» в formula.parts`);
        usedParts.add(part);
      }
      if (inFinal(ing) < -1e-9) {
        error(`${path}/parts`, `«${ing.name}»: в части уходит ${round(ing.grams - inFinal(ing))} г — больше, чем всего (${ing.grams} г)`);
      }
    });

    f.parts?.forEach((p, pi) => {
      if (!usedParts.has(p.id)) error(`${base}/formula/parts/${pi}`, `в часть «${p.name}» не входит ни один ингредиент`);
    });
    if (flourGrams(f) === 0) error(`${base}/formula`, 'нет муки (flour: true) — не от чего считать пекарские проценты');

    const expected = m.pan ? expectedDough(m.pan) : null;
    const dough = doughGrams(f);
    if (m.pan && expected !== null && Math.abs(dough - expected) / expected > PAN_LOAD_TOLERANCE) {
      const count = m.pan.count && m.pan.count > 1 ? ` × ${m.pan.count}` : '';
      warn(
        `${base}/pan`,
        `теста ${Math.round(dough)} г, а по загрузке формы (${m.pan.load} г/л × ${m.pan.volume} л${count}) ждём ≈ ${Math.round(expected)} г`,
      );
    }

    m.stages.forEach((stage, si) =>
      stage.steps.forEach((step, ti) => {
        const path = `${base}/stages/${si}/steps/${ti}`;
        if (step.minutes !== undefined && step.minutesMax !== undefined && step.minutesMax <= step.minutes) {
          error(path, `minutesMax (${step.minutesMax}) должен быть больше minutes (${step.minutes})`);
        }
        if (step.temp !== undefined && step.tempMax !== undefined && step.tempMax <= step.temp) {
          error(path, `tempMax (${step.tempMax}) должен быть больше temp (${step.temp})`);
        }
      }),
    );
  });

  b.attempts?.forEach((a, i) => {
    if (a.method !== undefined && !methodIds.has(a.method)) error(`/attempts/${i}/method`, `нет способа «${a.method}»`);
  });

  return issues;
}

export function checkBaking(k: Baking, file: string): Issue[] {
  const issues: Issue[] = [];
  const error = (path: string, message: string) => issues.push({ severity: 'error', file, path, message });
  const norm = (s: string) => s.trim().toLowerCase().replace(/ё/g, 'е');

  uniqueIds(k.guides, '/guides', error);
  k.guides.forEach((g, gi) =>
    g.sections.forEach((s, si) => {
      if (!s.text && !s.points) error(`/guides/${gi}/sections/${si}`, `в разделе «${s.title}» нет ни текста, ни пунктов`);
    }),
  );

  const ideas = new Set<string>();
  k.ideas?.forEach((idea, i) => {
    if (ideas.has(norm(idea.title))) error(`/ideas/${i}`, `идея «${idea.title}» указана дважды`);
    ideas.add(norm(idea.title));
  });

  return issues;
}

/* ------------------------------------------------------------------ */
/* Смысловые проверки: каталог продуктов                               */
/* ------------------------------------------------------------------ */

export function checkFoods(f: Foods, file: string): Issue[] {
  const issues: Issue[] = [];
  const error = (path: string, message: string) => issues.push({ severity: 'error', file, path, message });
  const warn = (path: string, message: string) => issues.push({ severity: 'warning', file, path, message });
  const norm = (s: string) => s.trim().toLowerCase().replace(/ё/g, 'е');

  const sources = uniqueIds(f.sources, '/sources', error);
  const urls = new Set<string>();
  f.sources.forEach((s, i) => {
    if (urls.has(s.url)) error(`/sources/${i}/url`, `ссылка ${s.url} уже есть в другом источнике`);
    urls.add(s.url);
  });

  uniqueIds(f.groups, '/groups', error);
  const ids = new Set<string>();
  const names = new Set<string>();
  const cited = new Set<string>();
  f.groups.forEach((g, gi) =>
    g.items.forEach((food, fi) => {
      const path = `/groups/${gi}/items/${fi}`;
      if (ids.has(food.id)) error(`${path}/id`, `id «${food.id}» повторяется`);
      ids.add(food.id);
      if (names.has(norm(food.name))) error(`${path}/name`, `«${food.name}» уже есть в каталоге`);
      names.add(norm(food.name));
      food.sources?.forEach((id, si) => {
        if (!sources.has(id)) error(`${path}/sources/${si}`, `нет источника «${id}»`);
        cited.add(id);
      });
    }),
  );
  f.sources.forEach((s, i) => {
    if (!cited.has(s.id)) warn(`/sources/${i}`, `на источник «${s.id}» не ссылается ни одна позиция`);
  });

  return issues;
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
  const roles = uniqueIds(p.roles ?? [], '/roles', error);
  if (p.roles && p.roles.length !== p.conditions.cooks) {
    warn('/roles', `ролей ${p.roles.length}, а поваров в conditions.cooks — ${p.conditions.cooks}`);
  }

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

    if (p.roles) {
      if (!step.role) error(`${path}/role`, `у шага «${step.id}» нет роли, а в техкарте заданы roles`);
      else if (!roles.has(step.role)) error(`${path}/role`, `нет роли с id «${step.role}»`);
    } else if (step.role) {
      error(`${path}/role`, `у шага «${step.id}» есть роль, но в техкарте нет roles`);
    }
    if (p.roles && !step.passive && !step.zones) {
      error(`${path}/zones`, `у шага «${step.id}» нет зон, а в техкарте заданы roles`);
    }
    if (step.rest && !step.passive) error(`${path}/passive`, `отдых «${step.id}» — пассивный шаг: нужен passive: true`);

    step.dishes?.forEach((id, j) => {
      usedDishes.add(id);
      if (!dishes.has(id)) error(`${path}/dishes/${j}`, `нет блюда с id «${id}»`);
    });
    step.equipment?.forEach((id, j) => {
      if (!equipment.has(id)) error(`${path}/equipment/${j}`, `нет техники с id «${id}»`);
    });
    step.uses?.forEach((use, j) => trackUse(use, `${path}/uses/${j}`));
  });

  if (p.roles) {
    for (const c of zoneConflicts(p.steps)) {
      error(
        `/steps/${c.index}/zones`,
        `«${c.first}» и «${c.second}» — разные роли одновременно в одной зоне (${ZONE_LABELS[c.zone].toLowerCase()}), ${c.from}–${c.to}-я минута`,
      );
    }
  }
  if (!p.cooked) {
    checkSalt(p, error);
    for (const o of equipmentOveruse(p)) {
      error(
        `/steps/${o.index}/equipment`,
        `шаги ${o.busy.map((s) => `«${s.id}»`).join(', ')} одновременно берут «${o.item.id}», а в equipment — ${o.item.count ?? 1} шт.: возьмите другую посуду или сдвиньте шаг`,
      );
    }
  }
  if (p.roles && !p.cooked) {
    for (const c of stageConflicts(p)) {
      error(
        `/steps/${c.index}/role`,
        `«${c.other.id}» и «${c.wait.id}» — одна стадия у разных ролей: кто ставит на плиту или в духовку, тот включает таймер, мешает и снимает`,
      );
    }
    for (const g of idleGaps(p.steps)) {
      error(`/steps/${g.index}/at`, `у роли «${g.role}» с ${g.from}-й по ${g.to}-ю минуту нет шага — паузу оформите отдыхом с таймером (rest)`);
    }
  }

  p.dishes.forEach((dish, i) => {
    if (!usedDishes.has(dish.id)) warn(`/dishes/${i}`, `блюдо «${dish.id}» не упоминается ни в одном шаге`);
    const packs = new Set<string>();
    dish.packaging.forEach((pack, j) => {
      const key = JSON.stringify([pack.container, pack.person, pack.storage, pack.days]);
      if (packs.has(key)) {
        warn(`/dishes/${i}/packaging/${j}`, `«${pack.container}» (${pack.storage}) уже есть в фасовке — объедините строки через count`);
      }
      packs.add(key);
      if (pack.person && !p.ration) error(`/dishes/${i}/packaging/${j}/person`, 'фасовка ссылается на рацион, а рациона в техкарте нет');
    });
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

  if (p.ration) checkRation(p, p.ration, dishes, error, warn);

  return issues;
}

/** Допустимое отклонение дня от цели по калориям; белок — не меньше цели на столько же. */
export const RATION_TOLERANCE = 0.1;

function checkRation(
  p: CookPlan,
  ration: Ration,
  dishes: Set<string>,
  error: (path: string, message: string) => void,
  warn: (path: string, message: string) => void,
) {
  const people = uniqueIds(ration.people, '/ration/people', error);
  const extras = uniqueIds(ration.extras, '/ration/extras', error);
  const usedExtras = new Set<string>();

  ration.people.forEach((person, i) => {
    const seen = new Set<string>();
    person.portions.forEach((portion, j) => {
      const path = `/ration/people/${i}/portions/${j}`;
      if (!dishes.has(portion.dish)) error(`${path}/dish`, `нет блюда с id «${portion.dish}»`);
      if (seen.has(portion.dish)) error(`${path}/dish`, `порция «${portion.dish}» у ${person.name} указана дважды`);
      seen.add(portion.dish);
      if (portion.reheat.active > portion.reheat.total) {
        error(`${path}/reheat/active`, `разогрев «${portion.dish}» у ${person.name}: руками ${portion.reheat.active} мин — больше, чем всего (${portion.reheat.total})`);
      }
      const kcalIssue = checkMacros(portion);
      if (kcalIssue) warn(path, kcalIssue);
    });
  });

  // КБЖУ порций рациона показываются в карточке блюда — второе значение в dish.nutrition разойдётся с ними.
  p.dishes.forEach((dish, i) => {
    if (dish.nutrition && ration.people.some((person) => person.portions.some((x) => x.dish === dish.id))) {
      warn(`/dishes/${i}/nutrition`, `КБЖУ блюда «${dish.id}» уже заданы в порциях рациона — nutrition лишний`);
    }
  });

  ration.extras.forEach((extra, i) => {
    const seen = new Set<string>();
    extra.servings.forEach((serving, j) => {
      const path = `/ration/extras/${i}/servings/${j}/person`;
      if (!people.has(serving.person)) error(path, `нет человека с id «${serving.person}»`);
      if (seen.has(serving.person)) error(path, `«${serving.person}» в «${extra.id}» указан дважды`);
      seen.add(serving.person);
    });
  });

  const checkExtra = (id: string, meal: 'breakfast' | 'snack', path: string) => {
    usedExtras.add(id);
    const extra = ration.extras.find((e) => e.id === id);
    if (!extra) error(path, `нет завтрака или перекуса с id «${id}»`);
    else if (extra.meal !== meal) error(path, `«${id}» — ${extra.meal === 'breakfast' ? 'завтрак' : 'перекус'}, а стоит в ${meal === 'breakfast' ? 'завтраке' : 'перекусах'}`);
  };

  ration.days.forEach((day, i) => {
    const path = `/ration/days/${i}`;
    if (day.day !== i + 1) error(`${path}/day`, `дни должны идти подряд с 1-го: на месте ${i + 1}-го стоит ${day.day}-й`);
    if (day.breakfast) checkExtra(day.breakfast, 'breakfast', `${path}/breakfast`);
    const daySnacks = new Set<string>();
    for (const slot of ['morning', 'afternoon', 'evening'] as const) {
      day.snacks?.[slot]?.forEach((id, j) => {
        checkExtra(id, 'snack', `${path}/snacks/${slot}/${j}`);
        if (daySnacks.has(id)) error(`${path}/snacks/${slot}/${j}`, `«${id}» уже стоит в другом перекусе дня ${day.day}`);
        daySnacks.add(id);
      });
    }
    for (const meal of ['lunch', 'dinner'] as const) {
      const id = day[meal];
      if (!dishes.has(id)) {
        error(`${path}/${meal}`, `нет блюда с id «${id}»`);
        continue;
      }
      ration.people.forEach((person) => {
        if (!person.portions.some((x) => x.dish === id)) error(`${path}/${meal}`, `у ${person.name} нет порции блюда «${id}»`);
      });
    }

    ration.people.forEach((person) => {
      const total = personDay(p, ration, day, person.id);
      const off = deviation(total.kcal, person.target.kcal);
      if (Math.abs(off) > RATION_TOLERANCE) {
        warn(path, `день ${day.day}, ${person.name}: ${round(total.kcal)} ккал при цели ${person.target.kcal} (${off > 0 ? '+' : ''}${Math.round(off * 100)} %)`);
      }
      const protein = person.target.protein;
      if (protein && total.protein < protein * (1 - RATION_TOLERANCE)) {
        warn(path, `день ${day.day}, ${person.name}: белка ${round(total.protein)} г при цели ${protein} г`);
      }
    });
  });

  ration.extras.forEach((extra, i) => {
    if (!usedExtras.has(extra.id)) warn(`/ration/extras/${i}`, `«${extra.id}» не стоит ни в одном дне рациона`);
  });

  checkPackedMeals(p, ration, people, error);
  if (!p.cooked) checkMeals(p, ration, error);
}

const MEAL_NAMES = { lunch: ['обед', 'обеде'], dinner: ['ужин', 'ужине'] } as const;
const DINNER_HANDS_MAX = 10;

/** Блюдо — либо обед, либо ужин: обед греют только в микроволновке на работе, ужин доводят дома руками не дольше 10 минут. */
function checkMeals(p: CookPlan, ration: Ration, error: (path: string, message: string) => void) {
  const meals = new Map(p.dishes.map((dish) => [dish.id, dish.meal]));
  p.dishes.forEach((dish, i) => {
    if (!dish.meal && ration.days.some((day) => day.lunch === dish.id || day.dinner === dish.id)) {
      error(`/dishes/${i}/meal`, `у блюда «${dish.id}» нет meal: обед это или ужин`);
    }
  });
  ration.days.forEach((day, i) => {
    for (const meal of ['lunch', 'dinner'] as const) {
      const actual = meals.get(day[meal]);
      if (actual && actual !== meal) {
        error(`/ration/days/${i}/${meal}`, `«${day[meal]}» — ${MEAL_NAMES[actual][0]}, а стоит в ${MEAL_NAMES[meal][1]} дня ${day.day}`);
      }
    }
  });
  ration.people.forEach((person, i) => {
    person.portions.forEach((portion, j) => {
      const path = `/ration/people/${i}/portions/${j}/reheat`;
      const meal = meals.get(portion.dish);
      const { methods, active } = portion.reheat;
      if (meal === 'lunch' && methods.some((m) => m !== 'microwave')) {
        error(`${path}/methods`, `обед «${portion.dish}» у ${person.name} греют только в микроволновке`);
      }
      if (meal === 'dinner' && active > DINNER_HANDS_MAX) {
        error(`${path}/active`, `ужин «${portion.dish}» у ${person.name} — ${active} мин руками, а можно не больше ${DINNER_HANDS_MAX}`);
      }
    });
  });
}

const SALT = /(?:^|\s)соль(?=\s|,|$)/iu;
const SALT_BY_EYE = /щепотк\S*\s+соли|сол[ьи]\s+по\s+вкусу|посолить\s+по\s+вкусу/iu;

/** Соль — только граммами: в октябре ложки и «по вкусу» дали 0,3–0,4 % от готового вместо 0,8–1 %. */
function checkSalt(p: CookPlan, error: (path: string, message: string) => void) {
  const salt = new Set(p.ingredients.filter((i) => SALT.test(i.name)).map((i) => i.id));
  p.steps.forEach((step, i) => {
    step.uses?.forEach((use, j) => {
      if (salt.has(use.ingredient) && (use.toTaste || use.unit !== 'g')) {
        error(`/steps/${i}/uses/${j}`, `соль в «${step.id}» — только граммами, без «по вкусу» и ложек`);
      }
    });
    if (SALT_BY_EYE.test(`${step.title} ${step.details ?? ''} ${step.tip ?? ''}`)) {
      error(`/steps/${i}/details`, `в «${step.id}» соль на глаз — укажите граммы`);
    }
  });
}

/** Каждый обед и ужин рациона лежит ровно в одном контейнере своего блюда и своего человека: по фасовке рацион показывает, откуда его взять. */
function checkPackedMeals(p: CookPlan, ration: Ration, people: Set<string>, error: (path: string, message: string) => void) {
  const mealName = (meal: 'lunch' | 'dinner') => (meal === 'lunch' ? 'обед' : 'ужин');
  const slot = (dish: string, person: string, day: number, meal: string) => `${dish}/${person}/${day}/${meal}`;
  const packed = new Map<string, number>();

  p.dishes.forEach((dish, i) => {
    dish.packaging.forEach((pack, j) => {
      const { person, meals } = pack;
      if (!person || !meals) return;
      const path = `/dishes/${i}/packaging/${j}`;
      if (!people.has(person)) error(`${path}/person`, `нет человека с id «${person}»`);
      if (meals.length !== pack.count) error(`${path}/meals`, `приёмов пищи ${meals.length}, а контейнеров ${pack.count}`);
      meals.forEach((m, k) => {
        if (ration.days[m.day - 1]?.[m.meal] !== dish.id) {
          error(`${path}/meals/${k}`, `в рационе на ${mealName(m.meal)} дня ${m.day} не «${dish.id}»`);
        }
        const key = slot(dish.id, person, m.day, m.meal);
        packed.set(key, (packed.get(key) ?? 0) + 1);
      });
    });
  });

  ration.days.forEach((day, i) => {
    for (const meal of ['lunch', 'dinner'] as const) {
      ration.people.forEach((person) => {
        const count = packed.get(slot(day[meal], person.id, day.day, meal)) ?? 0;
        const what = `${mealName(meal)} дня ${day.day} у ${person.name}`;
        if (count === 0) error(`/ration/days/${i}/${meal}`, `${what} не лежит ни в одном контейнере — добавьте его в meals фасовки «${day[meal]}»`);
        if (count > 1) error(`/ration/days/${i}/${meal}`, `${what} лежит в ${count} контейнерах`);
      });
    }
  });
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

function uniqueItems(
  items: { item: string }[],
  path: string,
  where: string,
  error: (path: string, message: string) => void,
) {
  const norm = (s: string) => s.trim().toLowerCase().replace(/ё/g, 'е');
  const seen = new Set<string>();
  items.forEach(({ item }, i) => {
    if (seen.has(norm(item))) error(`${path}/${i}`, `«${item}» ${where} указан дважды`);
    seen.add(norm(item));
  });
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
