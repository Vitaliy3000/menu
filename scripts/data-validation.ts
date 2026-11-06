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
import { ZONE_LABELS, zoneConflicts } from '../src/lib/zones.ts';
import { equipmentOveruse } from './equipment-use.ts';
import { checkRation } from './ration-validation.ts';
import { idleGaps, restIntrusions, stageConflicts } from './role-flow.ts';
import { checkMacros, round, uniqueIds } from './validation-helpers.ts';
import type { Kitchen } from '../src/types/kitchen.gen.ts';
import type { Bake } from '../src/types/bake.gen.ts';
import type { Baking } from '../src/types/baking.gen.ts';
import type { Foods } from '../src/types/foods.gen.ts';
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
} as const;

export const SCHEMA_FILES = {
  recipes: 'schemas/recipe.schema.json',
  plans: 'schemas/cook-plan.schema.json',
  kitchen: 'schemas/kitchen.schema.json',
  bakes: 'schemas/bake.schema.json',
  baking: 'schemas/baking.schema.json',
  foods: 'schemas/foods.schema.json',
} as const;

/** Справочник кухни — один файл. */
export const KITCHEN_FILE = 'data/kitchen.json';
/** Справочник выпечки — один файл. */
export const BAKING_FILE = 'data/baking.json';
/** Каталог продуктов и блюд — один файл. */
export const FOODS_FILE = 'data/foods.json';

type Kind = keyof typeof DATA_DIRS;

/* ------------------------------------------------------------------ */
/* Загрузка с диска                                                    */
/* ------------------------------------------------------------------ */

export async function validateProject(root: string): Promise<DataSet> {
  const [recipeSchema, planSchema, kitchenSchema, bakeSchema, bakingSchema, foodsSchema] = await Promise.all([
    readJson(join(root, SCHEMA_FILES.recipes)),
    readJson(join(root, SCHEMA_FILES.plans)),
    readJson(join(root, SCHEMA_FILES.kitchen)),
    readJson(join(root, SCHEMA_FILES.bakes)),
    readJson(join(root, SCHEMA_FILES.baking)),
    readJson(join(root, SCHEMA_FILES.foods)),
  ]);
  const [recipeFiles, planFiles, bakeFiles, kitchenFile, bakingFile, foodsFile] = await Promise.all([
    readSources(root, DATA_DIRS.recipes),
    readSources(root, DATA_DIRS.plans),
    readSources(root, DATA_DIRS.bakes),
    readSource(root, KITCHEN_FILE),
    readSource(root, BAKING_FILE),
    readSource(root, FOODS_FILE),
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

  return {
    recipes: recipes.map((r) => r.doc),
    plans: plans.map((p) => p.doc),
    kitchen,
    bakes: bakes.map((b) => b.doc),
    baking,
    foods,
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
    for (const r of restIntrusions(p.steps)) {
      error(
        `/steps/${r.index}/at`,
        `«${r.step.id}» начинается на ${r.step.at}-й минуте, во время отдыха «${r.rest.id}»: шаги той же минуты ставьте до отдыха, следующий — после его таймера`,
      );
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

/* ------------------------------------------------------------------ */
/* Отчёт                                                               */
/* ------------------------------------------------------------------ */

export function formatIssue(i: Issue): string {
  const where = i.path ? `${i.file} → ${i.path}` : i.file;
  return `${i.severity === 'error' ? '✗' : '!'} ${where}: ${i.message}`;
}
