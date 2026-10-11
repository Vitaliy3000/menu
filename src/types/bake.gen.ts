/* Сгенерировано из schemas/bake.schema.json — не редактировать вручную. Обновить: npm run types */

/**
 * Группа в каталоге: pan — формовой хлеб, hearth — подовый хлеб (на стали или камне), pizza — пицца и фокачча, sweet — сдоба и сладкая выпечка.
 *
 * This interface was referenced by `Bake`'s JSON-Schema
 * via the `definition` "BakeKind".
 */
export type BakeKind = 'pan' | 'hearth' | 'pizza' | 'sweet';

/**
 * Рецептура раздела «Выпечка»: формула в граммах (пекарские проценты сайт считает сам), форма, режим по этапам с температурами и журнал пробных выпечек. Самостоятельная сущность: не ссылается на рецепты, техкарты и справочники.
 */
export interface Bake {
  /**
   * Путь к схеме для подсказок в редакторе. На сайт не влияет.
   */
  $schema?: string;
  /**
   * Уникальный идентификатор и часть URL. Должен совпадать с именем файла без .json.
   */
  id: string;
  /**
   * Название по-русски: «Шокупан на юдане». Уникально среди рецептур выпечки.
   */
  title: string;
  /**
   * Название в оригинале, если оно отличается: «生食パン · Nama Shokupan», «Pain brioché».
   */
  original?: string;
  kind: BakeKind;
  /**
   * Что это за выпечка и чем она хороша. 1–3 предложения.
   */
  description: string;
  /**
   * Свободные теги в нижнем регистре: «форма с крышкой», «холодная ферментация».
   */
  tags?: string[];
  /**
   * Каким должен получиться результат: мякиш, корка, вкус. По нему сверяют готовую выпечку.
   */
  result?: string;
  /**
   * Способы приготовления: прямой, с предферментом. Обычно один; если несколько — на странице переключатель, и у каждого нужно название.
   *
   * @minItems 1
   */
  methods: [BakeMethod, ...BakeMethod[]];
  /**
   * Журнал пробных выпечек: что пошло не так и что поменять в следующий раз. Показывается перед формулой.
   */
  attempts?: Attempt[];
  /**
   * Частые проблемы и их причины.
   */
  troubleshooting?: Trouble[];
  variations?: Variations;
  /**
   * Советы, замены и объяснения «почему так».
   */
  tips?: string[];
  /**
   * Как подавать и хранить.
   */
  serving?: string;
  /**
   * Откуда взята рецептура.
   */
  sources?: BakeSource[];
}
/**
 * This interface was referenced by `Bake`'s JSON-Schema
 * via the `definition` "Method".
 */
export interface BakeMethod {
  /**
   * Идентификатор способа, уникальный в рецептуре. Попадает в URL: ?method=straight.
   */
  id: string;
  /**
   * Название способа: «С предферментом», «Прямой». Обязательно, если способов несколько.
   */
  title?: string;
  /**
   * Короткое пояснение к способу.
   */
  note?: string;
  pan?: Pan;
  time?: BakeTime;
  formula: Formula;
  /**
   * Этапы работы по порядку.
   *
   * @minItems 1
   */
  stages: [BakeStage, ...BakeStage[]];
}
/**
 * Форма или противень, на которые рассчитана формула.
 *
 * This interface was referenced by `Bake`'s JSON-Schema
 * via the `definition` "Pan".
 */
export interface Pan {
  /**
   * «Форма Pullman с крышкой», «Форма Agnelli».
   */
  name: string;
  /**
   * Сколько форм на один замес. По умолчанию 1.
   */
  count?: number;
  /**
   * Размер: «30 × 23 см», «95 × 209 × 86 мм внутри».
   */
  size?: string;
  /**
   * Объём одной формы, л.
   */
  volume?: number;
  /**
   * true — выпекается под крышкой, false — открытая форма.
   */
  lid?: boolean;
  /**
   * Загрузка: граммов теста на литр объёма формы. Валидатор сверяет её с весом теста (допуск 3 %).
   */
  load?: number;
}
/**
 * This interface was referenced by `Bake`'s JSON-Schema
 * via the `definition` "Time".
 */
export interface BakeTime {
  /**
   * Производственное время, мин: от замеса до выхода из духовки.
   */
  total: number;
  /**
   * Что не входит в total: «+ 5 ч созревания предфермента».
   */
  note?: string;
}
/**
 * Состав на один замес (на pan.count форм).
 *
 * This interface was referenced by `Bake`'s JSON-Schema
 * via the `definition` "Formula".
 */
export interface Formula {
  /**
   * Части, которые замешивают заранее: предфермент, юдане, автолиз. Финальное тесто = всего − части, а каждая часть входит в финальное тесто целиком.
   */
  parts?: DoughPart[];
  /**
   * @minItems 2
   */
  ingredients: [BakeIngredient, BakeIngredient, ...BakeIngredient[]];
}
/**
 * This interface was referenced by `Bake`'s JSON-Schema
 * via the `definition` "Part".
 */
export interface DoughPart {
  /**
   * Ключ для ingredient.parts.
   */
  id: string;
  /**
   * «Предфермент», «Юдане».
   */
  name: string;
}
/**
 * This interface was referenced by `Bake`'s JSON-Schema
 * via the `definition` "Ingredient".
 */
export interface BakeIngredient {
  /**
   * Название продукта: «Сильная хлебная мука».
   */
  name: string;
  /**
   * Всего граммов на замес, включая то, что уходит в части.
   */
  grams: number;
  /**
   * Мука: от суммы такой муки считаются пекарские проценты (мука = 100 %). Хотя бы одна мука в формуле обязательна.
   */
  flour?: boolean;
  /**
   * Сколько граммов уходит в каждую часть: {"yudane": 65}. Остаток идёт в финальное тесто.
   */
  parts?: {
    [k: string]: number;
  };
  /**
   * Уточнение: «12–13,5 % белка», «холодная».
   */
  note?: string;
  /**
   * Можно не добавлять. В вес теста всё равно входит.
   */
  optional?: boolean;
}
/**
 * This interface was referenced by `Bake`'s JSON-Schema
 * via the `definition` "Stage".
 */
export interface BakeStage {
  /**
   * «Предфермент», «Замес», «Расстойка и выпечка».
   */
  title: string;
  /**
   * @minItems 1
   */
  steps: [BakeStep, ...BakeStep[]];
}
/**
 * This interface was referenced by `Bake`'s JSON-Schema
 * via the `definition` "Step".
 */
export interface BakeStep {
  /**
   * Что сделать. Одно действие или короткая связка действий.
   */
  text: string;
  /**
   * Сколько длится шаг, мин. На это время ставится таймер.
   */
  minutes?: number;
  /**
   * Верхняя граница: minutes=50, minutesMax=60 → «50–60 мин». Таймер — на нижнюю.
   */
  minutesMax?: number;
  /**
   * Температура, °C: теста, расстойки или духовки — что именно, сказано в тексте шага.
   */
  temp?: number;
  /**
   * Верхняя граница: temp=26, tempMax=28 → «26–28 °C».
   */
  tempMax?: number;
  /**
   * Подсказка к шагу: признак готовности, частая ошибка.
   */
  tip?: string;
}
/**
 * This interface was referenced by `Bake`'s JSON-Schema
 * via the `definition` "Attempt".
 */
export interface Attempt {
  /**
   * «Попытка 1».
   */
  title?: string;
  /**
   * id способа, если заметки про конкретный способ.
   */
  method?: string;
  /**
   * ok — получилось, issues — получилось с замечаниями, failed — не получилось.
   */
  outcome: 'ok' | 'issues' | 'failed';
  /**
   * Что заметили и что поменять.
   *
   * @minItems 1
   */
  notes: [string, ...string[]];
}
/**
 * This interface was referenced by `Bake`'s JSON-Schema
 * via the `definition` "Trouble".
 */
export interface Trouble {
  /**
   * Симптом: «Корка лопнула».
   */
  problem: string;
  /**
   * Причины и что делать.
   */
  fix: string;
}
/**
 * This interface was referenced by `Bake`'s JSON-Schema
 * via the `definition` "Variations".
 */
export interface Variations {
  /**
   * Заголовок раздела: «Начинки».
   */
  title: string;
  /**
   * @minItems 1
   */
  items: [
    {
      name: string;
      text?: string;
    },
    ...{
      name: string;
      text?: string;
    }[]
  ];
}
/**
 * This interface was referenced by `Bake`'s JSON-Schema
 * via the `definition` "Source".
 */
export interface BakeSource {
  name: string;
  url?: string;
}
