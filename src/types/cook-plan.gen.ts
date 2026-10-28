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
 * Идентификатор внутри этой техкарты.
 */
export type LocalId1 = string;
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
export type LocalId2 = string;
/**
 * Зона кухни: prep — подготовка (доски, раковина, посудомойка), hot — горячая (плита и духовка), pack — фасовка, dry — сухое хранение, cold — холодное хранение. В prep, hot и pack одновременно работает только один человек.
 *
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "Zone".
 */
export type Zone = 'prep' | 'hot' | 'pack' | 'dry' | 'cold';
/**
 * Идентификатор внутри этой техкарты.
 */
export type LocalId3 = string;
/**
 * Приём пищи по порядку дня: breakfast — завтрак, morning — перекус после завтрака, lunch — обед, afternoon — перекус после обеда, dinner — ужин, evening — перекус после ужина.
 *
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "MealSlot".
 */
export type MealSlot = 'breakfast' | 'morning' | 'lunch' | 'afternoon' | 'dinner' | 'evening';
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
 * Идентификатор внутри этой техкарты.
 */
export type LocalId7 = string;

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
  /**
   * Техкарту уже готовили по прежним правилам: проверки хода работ — стадии у плиты и в духовке, паузы без отдыха, посуда в двух шагах сразу, — соли граммами и разделения на обеды и ужины к ней не применяются.
   */
  cooked?: boolean;
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
  /**
   * Обед или ужин — блюдо бывает только чем-то одним: обед греют в микроволновке на работе, ужин доводят дома. В рационе стоит только на своём месте.
   */
  meal?: 'lunch' | 'dinner';
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
  /**
   * Уточнение: «по 400 г». Дни рациона — в meals, не здесь.
   */
  note?: string;
  person?: LocalId1;
  /**
   * Какие обеды и ужины рациона лежат в этих контейнерах — по одному на контейнер, поэтому их столько же, сколько count. По ним рацион показывает, откуда взять блюдо и что вечером переложить из морозилки.
   *
   * @minItems 1
   */
  meals?: [PackMeal, ...PackMeal[]];
}
/**
 * Обед или ужин из рациона, который лежит в контейнере.
 *
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "PackMeal".
 */
export interface PackMeal {
  /**
   * Номер дня рациона.
   */
  day: number;
  /**
   * lunch — обед, dinner — ужин.
   */
  meal: 'lunch' | 'dinner';
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
  role?: LocalId2;
  /**
   * Где работают руки во время шага. Короткий заход в соседнюю зону — взять кастрюлю — не считается. Обязательно для активных шагов, если roles заданы; у пассивных — не нужно.
   *
   * @minItems 1
   */
  zones?: [Zone, ...Zone[]];
  /**
   * Подробности: как именно, на что смотреть.
   */
  details?: string;
  /**
   * Руки свободны: варится, запекается, остывает.
   */
  passive?: boolean;
  /**
   * Отдых или перерыв: пассивный шаг с таймером, по которому видно, когда начинать следующий. Если заданы roles, шаги каждой роли идут без промежутков — пауза бывает только таким шагом.
   */
  rest?: boolean;
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
 * Рацион на срок техкарты: меню каждого человека по дням. Обеды и ужины — блюда этой техкарты: откуда их взять, сайт берёт из фасовки (Packaging.meals), как греть — из порции. Завтраки и перекусы — из extras. Итоги дня сайт считает сам, валидатор сверяет их с целями.
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
   * Что человек ест не дома, а на работе. Это берут с собой утром — рацион покажет список «С собой» и пометит эти приёмы пищи. Туда — то, что легко взять и не нужно готовить.
   *
   * @minItems 1
   */
  atWork?: [MealSlot, ...MealSlot[]];
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
  dish: LocalId3;
  /**
   * Размер порции: «400 г», «стейк 180 г + 170 г риса».
   */
  size: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  reheat: PortionReheat;
}
/**
 * Как разогреть порцию: чем, сколько минут руками и всего, что делать.
 *
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "PortionReheat".
 */
export interface PortionReheat {
  /**
   * Чем греть. Обед — только microwave: его греют на работе.
   *
   * @minItems 1
   */
  methods: [
    'microwave' | 'stovetop' | 'oven' | 'sous-vide',
    ...('microwave' | 'stovetop' | 'oven' | 'sous-vide')[]
  ];
  /**
   * Минут руками: переложить, помешать, обжарить, заправить, разложить. У ужина — не больше 10.
   */
  active: number;
  /**
   * Минут от контейнера до тарелки вместе с ожиданием: духовка или су-вид «поставил и забыл» могут идти дольше.
   */
  total: number;
  /**
   * Как разогреть именно эту порцию: где, сколько минут, что сделать до и во время. Откуда взять контейнер, писать не нужно — это видно из фасовки.
   */
  text: string;
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
  /**
   * Откуда что взять и как приготовить — общее для всех; количества каждого — в servings.
   */
  how?: string;
}
/**
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "RationServing".
 */
export interface RationServing {
  person: LocalId4;
  /**
   * Что именно и сколько: «3 яйца, 20 г сыра, тост с маслом». Как готовить — в how.
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
  breakfast?: LocalId5;
  lunch: LocalId6;
  dinner: LocalId7;
  snacks?: RationSnacks;
  /**
   * Что в этот день не как обычно: «шнитт-лук — из морозилки, режем замороженным».
   */
  note?: string;
  /**
   * Что ещё вечером этого дня переложить из морозилки в холодильник к завтрашнему дню: «копчёный лосось». Обеды и ужины сюда не писать — их сайт выводит сам из фасовки.
   *
   * @minItems 1
   */
  thaw?: [string, ...string[]];
}
/**
 * Перекусы дня по времени — не больше трёх: после завтрака, после обеда и после ужина. В один перекус можно сложить несколько позиций из extras; у каждого человека — свои.
 *
 * This interface was referenced by `CookPlan`'s JSON-Schema
 * via the `definition` "RationSnacks".
 */
export interface RationSnacks {
  /**
   * После завтрака, до обеда.
   *
   * @minItems 1
   */
  morning?: [LocalId, ...LocalId[]];
  /**
   * После обеда, до ужина.
   *
   * @minItems 1
   */
  afternoon?: [LocalId, ...LocalId[]];
  /**
   * После ужина.
   *
   * @minItems 1
   */
  evening?: [LocalId, ...LocalId[]];
}
