/* Сгенерировано из schemas/taste-profile.schema.json — не редактировать вручную. Обновить: npm run types */

/**
 * −2 — не ест или больше не возьмёт («Не ем», «Избегаю»); −1 — не нравится; 0 — всё равно, ест в составе блюда; 1 — нравится; 2 — любит («Люблю», «Чем больше, тем лучше»).
 *
 * This interface was referenced by `TasteProfile`'s JSON-Schema
 * via the `definition` "Liking".
 */
export type Liking = number;
/**
 * This interface was referenced by `TasteProfile`'s JSON-Schema
 * via the `definition` "Ways".
 *
 * Items: grilled — жареное, гриль; deep-fried — во фритюре, в панировке; braised — тушёное, в соусе; baked — запечённое; boiled — варёное, в супе; cured — копчёное, солёное, вяленое; raw — сырое: тартар, суши, севиче.
 */
export type Ways = ('grilled' | 'deep-fried' | 'braised' | 'baked' | 'boiled' | 'cured' | 'raw')[];
/**
 * 1 — «Не ел(а), попробовал(а) бы»; 0 — «Не пробовал(а)», «Не знаю, что это» без ответа об интересе; −1 — «Не ел(а), не тянет».
 *
 * This interface was referenced by `TasteProfile`'s JSON-Schema
 * via the `definition` "Interest".
 */
export type Interest = number;

/**
 * Вкусовой профиль человека по анкетам «Вкусовой профиль», свайп-анкете (data/taste-deck.json) и разбору подбора в терминах каталога продуктов: оси вкуса, ноты аромата, кухни и id позиций из data/foods.json. При противоречии разбор подбора важнее анкеты, новая анкета — старой. Топ подбора строится только из позиций foods с оценкой от 0 и их близких вариантов; позиции, которых нет ни в foods, ни в untried, человеку незнакомы и идут только в отдельный список «попробовать».
 */
export interface TasteProfile {
  /**
   * Путь к схеме для подсказок в редакторе. На сайт не влияет.
   */
  $schema?: string;
  /**
   * Совпадает с именем файла без .json.
   */
  id: string;
  /**
   * Имя из анкеты.
   */
  name: string;
  /**
   * Когда заполнена последняя анкета.
   */
  answered: string;
  /**
   * Профиль словами: что любит и почему, чего избегает, противоречия между ответами, с чего начинать новое. Сюда же то, что не ложится в поля: прожарка, блюда без позиций в каталоге, оговорки свободных ответов.
   */
  summary: string;
  /**
   * Отношение к новой еде: familiar — ест привычное; similar — попробует похожее на знакомое; curious — с удовольствием пробует новое; adventurous — ищет самое необычное. В свайп-анкете — по доле ♥ на своей кухне и классике против этники и редких кухонь.
   */
  novelty: 'familiar' | 'similar' | 'curious' | 'adventurous';
  /**
   * Ограничения. Пусто — нет. Ограничение из «Другое», которого нет в списке, — в foods и summary.
   */
  diet: (
    | 'vegetarian'
    | 'vegan'
    | 'no-pork'
    | 'halal-kosher'
    | 'gluten-free'
    | 'lactose-free'
    | 'nut-allergy'
    | 'seafood-allergy'
    | 'calorie-conscious'
  )[];
  /**
   * Отношение к осям Taste каталога. liking: «Избегаю» — −2, «Немного — нормально» — 0, «Нравится» — 1, «Чем больше, тем лучше» — 2. max: «Избегаю» — 2, «Немного — нормально» — 5, «Нравится» — 8, «Чем больше, тем лучше» — 10.
   */
  taste: {
    sweet: TastePreference;
    sweetSavory: TastePreference1;
    sour: TastePreference2;
    salty: TastePreference2;
    bitter: TastePreference2;
    umami: TastePreference2;
    heat: TastePreference3;
    fat: TastePreference2;
  };
  aroma: Likings;
  cuisines: Likings1;
  foods: Likings2;
  /**
   * В каком виде человек ест продукт с удовольствием: mince — фарш (котлеты, тефтели), white-fish — треска, судак, fatty-fish — лосось, скумбрия, сельдь, shrimp-squid — креветки и кальмары, mussels-oysters — мидии и устрицы, liver — печень говяжья и куриная, offal — язык, сердце, желудки. Пусто — не ест. Неотмеченный способ — слабый минус: оценка блюда в foods важнее (лосось запечённый «Люблю», хотя запечённое не отмечено).
   */
  methods: {
    chicken: Ways;
    duck: Ways;
    beef: Ways;
    pork: Ways;
    lamb: Ways;
    mince: Ways;
    'white-fish': Ways;
    'fatty-fish': Ways;
    'shrimp-squid': Ways;
    'mussels-oysters': Ways;
    liver: Ways;
    'foie-gras': Ways;
    offal: Ways;
    eggs: Ways;
  };
  /**
   * Неприятные текстуры. Пусто — таких нет. jelly — желе и студень; slimy — слизистое (бамия, маслята, сырое яйцо); sticky — тягучее и липкое (моти, клейкий рис); rubbery — упругое (кальмар, осьминог); raw — сырая рыба и мясо; mushy — разваренные мягкие овощи; beads — крупинки и шарики (тапиока, чиа, икра); gristle — хрящи, кожа, жилки; chunks — кусочки в гладком.
   */
  textures: (
    'jelly' | 'slimy' | 'sticky' | 'rubbery' | 'raw' | 'mushy' | 'beads' | 'gristle' | 'chunks'
  )[];
  /**
   * Не пробовал, не знает, что это, или не знает этот вкус — материал для списка «попробовать», не для топа. Оценённое в aroma, cuisines или foods сюда не входит.
   */
  untried: {
    aroma: Interests;
    cuisines: Interests;
    foods: Interests;
  };
}
/**
 * Сладость десертов, фруктов, ягод и напитков.
 */
export interface TastePreference {
  /**
   * Насколько больше этого вкуса делает еду привлекательнее.
   */
  liking: number;
  /**
   * Уровень оси каталога, выше которого уже слишком.
   */
  max: number;
}
/**
 * Сладость в несладком: чернослив в мясе, мёд в заправке, ягодный соус к утке. Вместо sweet для позиций вне групп desserts, fruits, berries и drinks.
 */
export interface TastePreference1 {
  /**
   * Насколько больше этого вкуса делает еду привлекательнее.
   */
  liking: number;
  /**
   * Уровень оси каталога, выше которого уже слишком.
   */
  max: number;
}
/**
 * This interface was referenced by `TasteProfile`'s JSON-Schema
 * via the `definition` "TastePreference".
 */
export interface TastePreference2 {
  /**
   * Насколько больше этого вкуса делает еду привлекательнее.
   */
  liking: number;
  /**
   * Уровень оси каталога, выше которого уже слишком.
   */
  max: number;
}
/**
 * По шкале 0–10 из анкеты — она совпадает с осью heat каталога. liking: 0 — −2, 1–3 — 0, 4–6 — 1, 7–10 — 2; max — ответ плюс 1.
 */
export interface TastePreference3 {
  /**
   * Насколько больше этого вкуса делает еду привлекательнее.
   */
  liking: number;
  /**
   * Уровень оси каталога, выше которого уже слишком.
   */
  max: number;
}
/**
 * Ноты аромата каталога (ключи Aroma в foods.schema.json). Травы и специи — по своим нотам; продукт, который и есть нота (грибы — mushroom, оливки — olive), — тоже сюда, остальные продукты — в foods. Нота, ведущая в любимом блюде, но отмеченная «Не знаю этот вкус», — 1. Пара «что ближе» с нотой (укроп или кинза) — как в foods; противоречие с прямым ответом — 0 и в summary. Свайп-анкета: нота от 4 на карточках с тремя и больше ответами ♥ или ✕ — −1 при доле ♥ до 25 %, 1 — от 75 %; прежняя оценка того же знака остаётся, 0 сменяется, противоположная — 0 и в summary.
 */
export interface Likings {
  [k: string]: Liking;
}
/**
 * Кухни каталога (Cuisine в foods.schema.json). Строка анкеты — на все кухни, которые она называет: «Тайская и вьетнамская» — thai и vietnamese. Кухня с ответом «Не пробовал(а)», но с оценённым блюдом, где она первая, — оценка лучшего такого блюда, не выше 1. Свайп-анкета — по первой кухне карточки, как в aroma.
 */
export interface Likings1 {
  [k: string]: Liking;
}
/**
 * Позиции каталога по id: что человек ел, и то, чего есть не станет. Знакомые блюда: «Люблю» — 2, «Ем, нормально» — 0, «Не люблю» — −1. Новые блюда: «Ел(а), понравилось» — 1, «Ел(а), не понравилось» — −1. Ел за последние две недели — 1, берёт в ресторане — 2. Пары «что ближе»: выбранное и «оба нравятся» — 1, «ни то, ни другое» — −1 обоим. Строка — на все позиции, которые она называет, и на все формы одного блюда (сырое и готовое). Продукт «Не ем» в methods — −2 всем позициям, где он главный. Способ, который однозначно называет позицию (устрицы сырые, фуа-гра жареная), — 1; остальное из methods сюда не переносится: от способа не следует, что человек знает блюдо. Свайп-анкета: ♥ — 1, ✕ — −1 первой позиции карточки и всем её формам, «?» ничего не меняет; прежняя оценка того же знака остаётся, 0 сменяется, противоположная — 0 и в summary; позиция уходит из untried. Карточка, чьё фото противоречит оговорке из summary (стейк с кровью при medium well), оценок не меняет.
 */
export interface Likings2 {
  [k: string]: Liking;
}
/**
 * This interface was referenced by `TasteProfile`'s JSON-Schema
 * via the `definition` "Interests".
 */
export interface Interests {
  [k: string]: Interest;
}
/**
 * This interface was referenced by `TasteProfile`'s JSON-Schema
 * via the `definition` "Likings".
 */
export interface Likings3 {
  [k: string]: Liking;
}
