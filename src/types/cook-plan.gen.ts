/* Сгенерировано из schemas/cook-plan.schema.json — не редактировать вручную. Обновить: npm run types */

/**
 * Идентификатор внутри этой техкарты.
 *
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "LocalId".
 */
export type LocalId = string;
/**
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "EquipmentKind".
 */
export type EquipmentKind = 'oven' | 'hob' | 'appliance' | 'cookware' | 'tool' | 'container';
/**
 * Единица измерения. Отображается по-русски: g → г, tbsp → ст. л., clove → зубчик и т. д.
 *
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "Unit".
 */
export type Unit =
  | 'g'
  | 'kg'
  | 'ml'
  | 'l'
  | 'pcs'
  | 'tsp'
  | 'tbsp'
  | 'cup'
  | 'pinch'
  | 'clove'
  | 'bunch'
  | 'can'
  | 'slice'
  | 'sprig'
  | 'leaf'
  | 'pack'
  | 'handful';
/**
 * fridge — холодильник, freezer — морозилка, pantry — шкаф, serve — подать сразу.
 *
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "StorageKind".
 */
export type StorageKind = 'fridge' | 'freezer' | 'pantry' | 'serve';
/**
 * Отдел магазина — для группировки закупки.
 *
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "ShopSection".
 */
export type ShopSection =
  'produce' | 'meat' | 'fish' | 'dairy' | 'bakery' | 'grocery' | 'frozen' | 'spices' | 'other';

/**
 * Техкарта конкретного дня готовки. Полностью самодостаточна: свои продукты с итоговыми объёмами, своя техника, свои блюда и пошаговый таймлайн. Не ссылается на рецепты (Recipe) и не зависит от них. Таймлайн рассчитывается заранее — сайт его только показывает.
 */
export interface CookPlan {
  /**
   * Путь к схеме для подсказок в редакторе. На сайт не влияет.
   */
  $schema?: string;
  /**
   * Уникальный идентификатор и часть URL. Должен совпадать с именем файла без .json.
   */
  id: string;
  title: string;
  /**
   * Что получится в итоге и в чём логика дня. 1–2 предложения.
   */
  summary: string;
  /**
   * День готовки, YYYY-MM-DD.
   */
  date: string;
  /**
   * Плановое время начала, HH:MM. Если задано, к шагам добавляются часы.
   */
  start?: string;
  duration: PlanDuration;
  /**
   * Для кого и на какой срок: «2 взрослых, обеды и ужины пн–пт».
   */
  audience?: string;
  tags?: string[];
  conditions: Conditions;
  /**
   * Техника и посуда, под которые адаптирован план.
   *
   * @minItems 1
   */
  equipment: [Equipment, ...Equipment[]];
  /**
   * Что получится на выходе: блюда, выход, фасовка и хранение.
   *
   * @minItems 1
   */
  dishes: [Dish, ...Dish[]];
  /**
   * Итоговая закупка на весь день, уже в нужных объёмах.
   *
   * @minItems 1
   */
  ingredients: [PlanIngredient, ...PlanIngredient[]];
  /**
   * Что сделать заранее: накануне, утром, за час до начала.
   */
  beforeStart?: PrepTask[];
  /**
   * Таймлайн, отсортированный по at. Параллельные шаги имеют пересекающиеся интервалы.
   *
   * @minItems 1
   */
  steps: [PlanStep, ...PlanStep[]];
  /**
   * Общие замечания к дню: что критично, что можно сдвинуть.
   */
  notes?: string[];
}
/**
 * Длительность дня готовки, минут.
 *
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "PlanDuration".
 */
export interface PlanDuration {
  /**
   * От первого шага до последнего.
   */
  total: number;
  /**
   * Сколько из них заняты руки.
   */
  active: number;
}
/**
 * Условия, под которые составлен план.
 *
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "Conditions".
 */
export interface Conditions {
  /**
   * Сколько человек готовит.
   */
  cooks: number;
  /**
   * Кухня одной строкой: плита, духовка, место.
   */
  kitchen: string;
  /**
   * Ограничения и допущения: «морозилка: свободно ~25 л».
   */
  notes?: string[];
}
/**
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "Equipment".
 */
export interface Equipment {
  id: LocalId;
  name: string;
  kind: EquipmentKind;
  /**
   * Сколько штук нужно.
   */
  count?: number;
  /**
   * Характеристики: «60 л, конвекция», «Ø 28 см».
   */
  spec?: string;
  note?: string;
}
/**
 * Блюдо на выходе техкарты: выход (yield), порции, фасовка и хранение именно этой партии.
 *
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "Dish".
 */
export interface Dish {
  id: LocalId;
  name: string;
  description?: string;
  yield: Quantity;
  portions: number;
  /**
   * Размер порции: «≈ 450 мл», «2 бедра + 180 г гарнира».
   */
  portionSize?: string;
  /**
   * @minItems 1
   */
  packaging: [Packaging, ...Packaging[]];
  /**
   * Как разогревать именно эту партию.
   */
  reheat?: string;
  nutrition?: PlanNutrition;
}
/**
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "Quantity".
 */
export interface Quantity {
  amount: number;
  unit: Unit;
}
/**
 * Одна позиция фасовки.
 *
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "Packaging".
 */
export interface Packaging {
  /**
   * Тара: «Стеклянный контейнер 750 мл».
   */
  container: string;
  count: number;
  storage: StorageKind;
  /**
   * Сколько дней хранится с даты готовки. Сайт покажет дату «годен до».
   */
  days?: number;
  note?: string;
}
/**
 * Пищевая ценность одной порции (приблизительно).
 *
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "PlanNutrition".
 */
export interface PlanNutrition {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}
/**
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "PlanIngredient".
 */
export interface PlanIngredient {
  id: LocalId;
  name: string;
  /**
   * Сколько купить/взять на весь день (брутто).
   */
  amount: number;
  unit: Unit;
  section: ShopSection;
  /**
   * Обычно уже есть дома (соль, масло, специи).
   */
  staple?: boolean;
  /**
   * Уточнение: «нетто после чистки ≈ 1,8 кг», «любая жирность».
   */
  note?: string;
}
/**
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "PrepTask".
 */
export interface PrepTask {
  id: LocalId;
  /**
   * Когда: «накануне вечером», «за час до начала».
   */
  when: string;
  text: string;
  uses?: IngredientUse[];
}
/**
 * Продукт, который берём на этом шаге. ingredient — id из ingredients этой техкарты. amount+unit — сколько именно; toTaste — по вкусу; без них — вся позиция из закупки.
 *
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "IngredientUse".
 */
export interface IngredientUse {
  ingredient: LocalId;
  amount?: number;
  unit?: Unit;
  /**
   * По вкусу (соль, перец).
   */
  toTaste?: boolean;
  note?: string;
}
/**
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "PlanStep".
 */
export interface PlanStep {
  id: LocalId;
  /**
   * Начало шага: минут от старта дня.
   */
  at: number;
  /**
   * Сколько минут занимает шаг (для пассивных — ожидание).
   */
  duration: number;
  /**
   * Короткая команда: «Тыкву — в духовку».
   */
  title: string;
  /**
   * Подробности: как именно, на что смотреть.
   */
  details?: string;
  /**
   * Руки свободны: варится, запекается, остывает.
   */
  passive?: boolean;
  /**
   * id блюд из dishes, к которым относится шаг.
   */
  dishes?: LocalId[];
  /**
   * id техники из equipment, которая занята шагом.
   */
  equipment?: LocalId[];
  uses?: IngredientUse[];
  /**
   * Нагрев: «200 °C, конвекция», «средний огонь, 6/9».
   */
  heat?: string;
  timer?: Timer;
  /**
   * Признак готовности.
   */
  doneWhen?: string;
  /**
   * Критичный момент или техника безопасности.
   */
  warning?: string;
  tip?: string;
}
/**
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "Timer".
 */
export interface Timer {
  minutes: number;
  /**
   * Короткая подпись на таймере: «Тыква в духовке».
   */
  label: string;
}
