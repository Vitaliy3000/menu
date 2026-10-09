/* Сгенерировано из schemas/recipe.schema.json — не редактировать вручную. Обновить: npm run types */

/**
 * Раздел меню.
 *
 * This interface was referenced by `Recipe`'s JSON-Schema
 * via the `definition` "RecipeCategory".
 */
export type RecipeCategory =
  | 'breakfast'
  | 'soup'
  | 'salad'
  | 'main'
  | 'side'
  | 'pasta'
  | 'baking'
  | 'dessert'
  | 'snack'
  | 'sauce'
  | 'drink';
/**
 * This interface was referenced by `Recipe`'s JSON-Schema
 * via the `definition` "Diet".
 */
export type Diet = 'vegetarian' | 'vegan' | 'pescatarian' | 'gluten-free' | 'dairy-free';
/**
 * This interface was referenced by `Recipe`'s JSON-Schema
 * via the `definition` "Difficulty".
 */
export type Difficulty = 'easy' | 'medium' | 'hard';
/**
 * Единица измерения. Отображается по-русски: g → г, tbsp → ст. л., clove → зубчик и т. д.
 *
 * This interface was referenced by `Recipe`'s JSON-Schema
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
 * Можно ли замораживать готовое блюдо.
 *
 * This interface was referenced by `Recipe`'s JSON-Schema
 * via the `definition` "Freezing".
 */
export type Freezing = FreezingSuitable | FreezingUnsuitable;

/**
 * Обычный рецепт: универсальное описание блюда на N порций. Самостоятельная сущность, ничего не знает о техкартах (CookPlan).
 */
export interface Recipe {
  /**
   * Путь к схеме для подсказок в редакторе. На сайт не влияет.
   */
  $schema?: string;
  /**
   * Уникальный идентификатор и часть URL. Должен совпадать с именем файла без .json.
   */
  id: string;
  /**
   * Название блюда.
   */
  title: string;
  /**
   * Короткое описание: чем блюдо хорошо, какое оно на вкус. 1–3 предложения.
   */
  description: string;
  category: RecipeCategory;
  /**
   * Кухня, например «итальянская» или «домашняя».
   */
  cuisine?: string;
  /**
   * Диетические свойства. Используются в фильтрах каталога.
   */
  diet?: Diet[];
  /**
   * Свободные теги в нижнем регистре: «одна сковорода», «на неделю», «для гостей».
   */
  tags: string[];
  difficulty: Difficulty;
  servings: Servings;
  time: RecipeTime;
  nutrition: Nutrition;
  /**
   * Нужная посуда и техника.
   */
  equipment?: string[];
  /**
   * Ингредиенты, сгруппированные по смыслу («Для соуса», «Для подачи»). Для простых рецептов — одна группа без названия.
   *
   * @minItems 1
   */
  ingredients: [IngredientGroup, ...IngredientGroup[]];
  /**
   * Шаги приготовления, сгруппированные по этапам. Для простых рецептов — одна группа без названия.
   *
   * @minItems 1
   */
  steps: [StepGroup, ...StepGroup[]];
  /**
   * Советы, замены и типичные ошибки.
   */
  tips?: string[];
  seasonality: Seasonality;
  storage: Storage;
  freezing: Freezing;
  reheating: Reheating;
  image?: Image;
  source?: Source;
}
/**
 * Сколько порций получается из указанных количеств.
 *
 * This interface was referenced by `Recipe`'s JSON-Schema
 * via the `definition` "Servings".
 */
export interface Servings {
  /**
   * Количество порций.
   */
  count: number;
  /**
   * Выход в натуральных единицах, если полезно: «≈ 2,5 л», «12 сырников».
   */
  yield?: string;
}
/**
 * Время в минутах.
 *
 * This interface was referenced by `Recipe`'s JSON-Schema
 * via the `definition` "RecipeTime".
 */
export interface RecipeTime {
  /**
   * Активное время: когда руки заняты.
   */
  active: number;
  /**
   * Полное время от начала до подачи, включая ожидание.
   */
  total: number;
  /**
   * Что не входит в total: «+ ночь маринования».
   */
  note?: string;
}
/**
 * Пищевая ценность одной порции (приблизительно).
 *
 * This interface was referenced by `Recipe`'s JSON-Schema
 * via the `definition` "Nutrition".
 */
export interface Nutrition {
  /**
   * Калории, ккал.
   */
  kcal: number;
  /**
   * Белки, г.
   */
  protein: number;
  /**
   * Жиры, г.
   */
  fat: number;
  /**
   * Углеводы, г.
   */
  carbs: number;
  /**
   * Клетчатка, г.
   */
  fiber?: number;
}
/**
 * This interface was referenced by `Recipe`'s JSON-Schema
 * via the `definition` "IngredientGroup".
 */
export interface IngredientGroup {
  /**
   * Название группы: «Для соуса». Не нужно, если группа одна.
   */
  title?: string;
  /**
   * @minItems 1
   */
  items: [Ingredient, ...Ingredient[]];
}
/**
 * This interface was referenced by `Recipe`'s JSON-Schema
 * via the `definition` "Ingredient".
 */
export interface Ingredient {
  /**
   * Название продукта: «Помидоры в собственном соку».
   */
  name: string;
  /**
   * Количество. Если не задано — «по вкусу» (при toTaste) или без количества.
   */
  amount?: number;
  /**
   * Верхняя граница диапазона: amount=2, amountMax=3 → «2–3».
   */
  amountMax?: number;
  unit?: Unit;
  /**
   * Уточнение: «мелко нарезать», «комнатной температуры».
   */
  note?: string;
  /**
   * Можно не добавлять.
   */
  optional?: boolean;
  /**
   * Количество по вкусу.
   */
  toTaste?: boolean;
}
/**
 * This interface was referenced by `Recipe`'s JSON-Schema
 * via the `definition` "StepGroup".
 */
export interface StepGroup {
  /**
   * Название этапа: «Соус», «Сборка». Не нужно, если этап один.
   */
  title?: string;
  /**
   * @minItems 1
   */
  steps: [Step, ...Step[]];
}
/**
 * This interface was referenced by `Recipe`'s JSON-Schema
 * via the `definition` "Step".
 */
export interface Step {
  /**
   * Что сделать. Одно действие или короткая связка действий.
   */
  text: string;
  /**
   * Сколько длится шаг, минут.
   */
  minutes?: number;
  /**
   * Подсказка к шагу: признак готовности, частая ошибка.
   */
  tip?: string;
}
/**
 * Когда блюдо уместнее всего. Все 12 месяцев = круглый год.
 *
 * This interface was referenced by `Recipe`'s JSON-Schema
 * via the `definition` "Seasonality".
 */
export interface Seasonality {
  /**
   * Номера месяцев, 1 = январь.
   *
   * @minItems 1
   * @maxItems 12
   */
  months:
    | [number]
    | [number, number]
    | [number, number, number]
    | [number, number, number, number]
    | [number, number, number, number, number]
    | [number, number, number, number, number, number]
    | [number, number, number, number, number, number, number]
    | [number, number, number, number, number, number, number, number]
    | [number, number, number, number, number, number, number, number, number]
    | [number, number, number, number, number, number, number, number, number, number]
    | [number, number, number, number, number, number, number, number, number, number, number]
    | [
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number
      ];
  /**
   * Почему именно эти месяцы, чем заменить вне сезона.
   */
  note?: string;
}
/**
 * Хранение готового блюда.
 *
 * This interface was referenced by `Recipe`'s JSON-Schema
 * via the `definition` "Storage".
 */
export interface Storage {
  /**
   * Сколько дней хранится в холодильнике. 0 — лучше съесть сразу.
   */
  fridgeDays?: number;
  /**
   * Сколько дней хранится при комнатной температуре (выпечка, гранола).
   */
  roomDays?: number;
  /**
   * В чём хранить.
   */
  container?: string;
  note?: string;
}
export interface FreezingSuitable {
  suitable: true;
  /**
   * Срок хранения в морозилке, месяцев.
   */
  months: number;
  /**
   * Как замораживать: остудить, порционировать, тара.
   */
  how: string;
  /**
   * Как размораживать.
   */
  thawing: string;
}
export interface FreezingUnsuitable {
  suitable: false;
  /**
   * Почему не стоит замораживать.
   */
  note: string;
}
/**
 * Как разогревать. Пустой methods + note — для холодных блюд.
 *
 * This interface was referenced by `Recipe`'s JSON-Schema
 * via the `definition` "Reheating".
 */
export interface Reheating {
  methods: ReheatMethod[];
  note?: string;
}
/**
 * This interface was referenced by `Recipe`'s JSON-Schema
 * via the `definition` "ReheatMethod".
 */
export interface ReheatMethod {
  method: 'stovetop' | 'microwave' | 'oven' | 'airfryer' | 'steam';
  instructions: string;
  minutes?: number;
}
/**
 * This interface was referenced by `Recipe`'s JSON-Schema
 * via the `definition` "Image".
 */
export interface Image {
  /**
   * Путь относительно public/ (images/borsch.jpg) или абсолютный https-URL.
   */
  src: string;
  alt: string;
}
/**
 * This interface was referenced by `Recipe`'s JSON-Schema
 * via the `definition` "Source".
 */
export interface Source {
  name: string;
  url?: string;
}
