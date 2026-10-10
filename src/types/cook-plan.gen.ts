/* Сгенерировано из schemas/cook-plan.schema.json — не редактировать вручную. Обновить: npm run types */

/**
 * Идентификатор внутри этой техкарты.
 *
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "LocalId".
 */
export type LocalId = string;
/**
 * oven — духовка, hob — плита, appliance — техника, cookware — посуда, tool — инструменты, container — многоразовая тара, consumable — расходники: одноразовые контейнеры, пакеты, фольга, плёнка, пергамент, маркировка.
 *
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "EquipmentKind".
 */
export type EquipmentKind =
  'oven' | 'hob' | 'appliance' | 'cookware' | 'tool' | 'container' | 'consumable';
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
 * Идентификатор внутри этой техкарты.
 */
export type LocalId1 = string;
/**
 * Идентификатор внутри этой техкарты.
 */
export type LocalId2 = string;
/**
 * Идентификатор внутри этой техкарты.
 */
export type LocalId3 = string;
/**
 * Идентификатор внутри этой техкарты.
 */
export type LocalId4 = string;
/**
 * Идентификатор внутри этой техкарты.
 */
export type LocalId5 = string;
/**
 * Идентификатор внутри этой техкарты.
 */
export type LocalId6 = string;

/**
 * Техкарта дня готовки: самостоятельный план с уникальным названием. Не привязана к дате и не ссылается на рецепты (Recipe): свои продукты в итоговых объёмах, своя техника, свои блюда и пошаговый таймлайн, а по желанию — рацион: кто что ест по дням. Таймлайн рассчитывается заранее — сайт его только показывает. Порядок техкарт на сайте — порядок файлов в data/plans.
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
  /**
   * Уникальное название техкарты.
   */
  title: string;
  /**
   * Что получится в итоге и в чём логика дня. 1–2 предложения.
   */
  summary: string;
  /**
   * Рекомендуемое время начала, HH:MM. Часы на шагах считаются от него, а после «Начать готовку» — от фактического старта.
   */
  start?: string;
  duration: PlanDuration;
  /**
   * Для кого и на какой срок: «2 взрослых, обеды и ужины пн–пт».
   */
  audience?: string;
  cost?: PlanCost;
  tags?: string[];
  conditions: Conditions;
  /**
   * Кто готовит, если поваров несколько: у каждого свой ход работ и своя кнопка «Начать готовку», стартуют одновременно. Каждый шаг тогда помечен role.
   *
   * @minItems 2
   */
  roles?: [Role, Role, ...Role[]];
  /**
   * Техника, посуда и расходники, под которые адаптирован план. Расходники (kind: consumable) техкарта перечисляет сама: какие и сколько нужно на этот день.
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
  ration?: Ration;
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
 * Примерная стоимость продуктов за весь срок техкарты, включая докупки: сколько каждого продукта ушло в техкарту × цена за кг, л или штуку по обычным ценам магазина, без акций. Остатки упаковок не считаются, домашние запасы — по доле; контейнеры и расходники не входят.
 *
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "PlanCost".
 */
export interface PlanCost {
  /**
   * Сумма за весь срок техкарты, в валюте currency.
   */
  amount: number;
  /**
   * Код валюты ISO 4217: «EUR».
   */
  currency: string;
  /**
   * Где сверяли цены: «AH».
   */
  store: string;
  /**
   * Когда сверяли цены, YYYY-MM-DD.
   */
  date: string;
  /**
   * Что учтено и что нет: «без контейнеров — они ещё ≈ 50 €».
   */
  note?: string;
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
 * via the `definition` "Role".
 */
export interface Role {
  id: LocalId;
  /**
   * Как назвать роль на кнопке: «Повар», «Помощник».
   */
  name: string;
  /**
   * Чем занимается: «плита и соусы», «овощи, духовка, фасовка».
   */
  note?: string;
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
  /**
   * Купить к дню готовки: расходники и всё, чего нет на кухне. Такие позиции попадают в список покупок на вкладке «Продукты».
   */
  buy?: boolean;
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
   * Сколько дней хранится. После старта готовки сайт покажет дату «годен до».
   */
  days?: number;
  note?: string;
}
/**
 * Пищевая ценность одной порции (приблизительно) — если порция одна на всех. Если блюдо есть в рационе, КБЖУ берутся из порций людей, а это поле у блюда не задаётся.
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
  role?: LocalId1;
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
/**
 * Рацион на срок техкарты: кто что ест по дням. Обеды и ужины — блюда этой техкарты, завтраки и перекусы — из extras. Итоги дня сайт считает сам, валидатор сверяет их с целями.
 *
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "Ration".
 */
export interface Ration {
  /**
   * Для кого рацион: цели и размеры порций.
   *
   * @minItems 1
   */
  people: [RationPerson, ...RationPerson[]];
  /**
   * Всё, что едим помимо блюд техкарты: завтраки, перекусы, коктейли.
   */
  extras: RationExtra[];
  /**
   * Дни по порядку, начиная с 1-го — следующего после дня готовки.
   *
   * @minItems 1
   */
  days: [RationDay, ...RationDay[]];
  /**
   * Как пользоваться рационом: что можно менять местами, чем заменить.
   */
  notes?: string[];
}
/**
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "RationPerson".
 */
export interface RationPerson {
  id: LocalId;
  name: string;
  target: RationTarget;
  /**
   * Порция этого человека из каждого блюда техкарты, которое есть в рационе.
   *
   * @minItems 1
   */
  portions: [RationPortion, ...RationPortion[]];
  /**
   * Что входит в цель: «вместе с двумя протеиновыми коктейлями».
   */
  note?: string;
}
/**
 * Цель на день.
 *
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "RationTarget".
 */
export interface RationTarget {
  /**
   * Калории в день, ккал.
   */
  kcal: number;
  /**
   * Белок в день, г. Не задан — цели по белку нет.
   */
  protein?: number;
}
/**
 * Порция человека из блюда. Её КБЖУ показываются и в рационе, и в карточке блюда.
 *
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "RationPortion".
 */
export interface RationPortion {
  dish: LocalId2;
  /**
   * Размер порции: «400 г», «стейк 180 г + 170 г риса».
   */
  size: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}
/**
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "RationExtra".
 */
export interface RationExtra {
  id: LocalId;
  name: string;
  /**
   * breakfast — завтрак, snack — перекус или коктейль.
   */
  meal: 'breakfast' | 'snack';
  /**
   * Кто это ест и сколько. Кого нет в списке — тот это не ест.
   *
   * @minItems 1
   */
  servings: [RationServing, ...RationServing[]];
}
/**
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "RationServing".
 */
export interface RationServing {
  person: LocalId3;
  /**
   * Что именно и сколько: «250 г кварка, 40 г овсянки…».
   */
  text: string;
  kcal: number;
  protein: number;
}
/**
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "RationDay".
 */
export interface RationDay {
  /**
   * Номер дня; 1 — следующий после дня готовки.
   */
  day: number;
  breakfast?: LocalId4;
  lunch: LocalId5;
  dinner: LocalId6;
  /**
   * id перекусов из extras — у каждого человека свои.
   */
  snacks?: LocalId[];
  note?: string;
}
