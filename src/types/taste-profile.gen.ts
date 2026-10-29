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
 * via the `definition` "Keys".
 */
export type Keys = string[];

/**
 * Вкусовой профиль человека по анкете «Вкусовой профиль» в терминах каталога продуктов: оси вкуса, ноты аромата, кухни и id позиций из data/foods.json. По нему каталог ранжируется под человека: явная оценка позиции в foods важнее выведенной из вкуса, аромата и кухонь.
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
   * Когда заполнена анкета.
   */
  answered: string;
  /**
   * Профиль словами: что любит и почему, чего избегает, противоречия между ответами, с чего начинать новое. Сюда же то, что не ложится в поля: прожарка, текстуры без позиций в каталоге, оговорки свободных ответов.
   */
  summary: string;
  /**
   * Отношение к новой еде: familiar — ест привычное; similar — попробует похожее на знакомое; curious — с удовольствием пробует новое; adventurous — ищет самое необычное.
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
   * Не пробовал или не знает, что это: оценки нет, это материал для новых блюд. То, что уже оценено в aroma, cuisines или foods, сюда не входит.
   */
  untried: {
    aroma: Keys;
    cuisines: Keys;
    foods: Keys;
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
 * Ноты аромата каталога (ключи Aroma в foods.schema.json). Травы и специи — по своим нотам; продукт, который и есть нота (грибы — mushroom, оливки — olive), — тоже сюда, остальные продукты — в foods. Нота, ведущая в любимом блюде, но отмеченная «Не знаю этот вкус», — 1.
 */
export interface Likings {
  [k: string]: Liking;
}
/**
 * Кухни каталога (Cuisine в foods.schema.json). Строка анкеты — на все кухни, которые она называет: «Тайская и вьетнамская» — thai и vietnamese.
 */
export interface Likings1 {
  [k: string]: Liking;
}
/**
 * Позиции каталога по id, о которых говорят ответы: таблица блюд, продукты, свободные ответы, способы приготовления (отмеченный способ — 1), примеры текстур (неприятная — −1) и десертов (выбранный — 1). Формы одного блюда (сырое и готовое) — с одной оценкой. Блюдо, где главный продукт человек не ест, — тоже −2.
 */
export interface Likings2 {
  [k: string]: Liking;
}
/**
 * This interface was referenced by `TasteProfile`'s JSON-Schema
 * via the `definition` "Likings".
 */
export interface Likings3 {
  [k: string]: Liking;
}
