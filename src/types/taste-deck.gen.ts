/* Сгенерировано из schemas/taste-deck.schema.json — не редактировать вручную. Обновить: npm run types */

/**
 * This interface was referenced by `TasteDeck`'s JSON-Schema
 * via the `definition` "Slug".
 */
export type Slug = string;

/**
 * Колода анкеты «Вкусовой профиль» v3: фото блюд, человек свайпает «съел(а) бы с удовольствием», «нет» или «не знаю, что это». Карточки разбиты на серии: внутри серии меняется что-то одно, поэтому разница в ответах относится к нему. Метки повторяются в разных сериях, чтобы отделить, например, кинзу от грузинской кухни. Вкус, аромат и кухня карточки берутся из каталога по её позициям foods. Порядок показа — по кругу по сериям в порядке файла: первые карточки всех серий, потом вторые и так далее, поэтому первой в серии стоит самая привычная. Приложение — taste-swipe/, фото — taste-swipe/photos/<id>.jpg.
 */
export interface TasteDeck {
  /**
   * Путь к схеме для подсказок в редакторе. На приложение не влияет.
   */
  $schema?: string;
  /**
   * @minItems 1
   */
  series: [Series, ...Series[]];
  /**
   * @minItems 1
   */
  cards: [Card, ...Card[]];
}
/**
 * This interface was referenced by `TasteDeck`'s JSON-Schema
 * via the `definition` "Series".
 */
export interface Series {
  id: Slug;
  title: string;
  /**
   * Что меняется от карточки к карточке, остальное в серии одинаковое.
   */
  varies: string;
}
/**
 * This interface was referenced by `TasteDeck`'s JSON-Schema
 * via the `definition` "Card".
 */
export interface Card {
  /**
   * Имя файла фото без .jpg.
   */
  id: string;
  /**
   * Название, под которым блюдо узнают.
   */
  name: string;
  /**
   * Состав одной строкой: многие знают блюдо под другим названием или в другой версии.
   */
  caption: string;
  series: Slug;
  /**
   * Позиции каталога на фото: блюдо и гарнир или соус. Ответ становится оценкой всех этих позиций, вкус и аромат карточки — наибольшие по ним, кухня — первая у первой позиции.
   *
   * @minItems 1
   */
  foods: [Slug, ...Slug[]];
  /**
   * Насколько блюдо привычно русскоязычному человеку в Европе: 1 — своя кухня (русская, украинская, кавказская, среднеазиатская); 2 — мировая классика (итальянская, французская, американская, суши); 3 — популярная этника (азиатская, индийская, мексиканская, ближневосточная); 4 — редкая. По «нравится» в кругах 3–4 против 1–2 и доле «не знаю» считается отношение к новому.
   */
  circle: number;
  /**
   * home — домашняя еда; restaurant — обычно едят в ресторане; street — уличная, едят руками.
   */
  style: 'home' | 'restaurant' | 'street';
  /**
   * Сложность вкуса: 1 — два-три понятных вкуса; 2 — несколько слоёв; 3 — много специй и составляющих.
   */
  complexity: number;
  /**
   * Сытость порции: лёгкое, средне, сытно, тяжело.
   */
  weight: 'light' | 'medium' | 'hearty' | 'heavy';
  /**
   * Главное в блюде. Значения — ключи methods вкусового профиля, плюс deli — колбасы и копчёности, cheese — сыр и творог, legumes — бобовые, vegetables — овощи, грибы и крупы без мяса.
   */
  protein:
    | 'chicken'
    | 'duck'
    | 'beef'
    | 'pork'
    | 'lamb'
    | 'mince'
    | 'white-fish'
    | 'fatty-fish'
    | 'shrimp-squid'
    | 'mussels-oysters'
    | 'liver'
    | 'offal'
    | 'eggs'
    | 'deli'
    | 'cheese'
    | 'legumes'
    | 'vegetables';
  /**
   * Способ — как Ways вкусового профиля: grilled — жареное, гриль; deep-fried — фритюр; braised — тушёное, в соусе; baked — запечённое; boiled — варёное, суп; cured — солёное, копчёное; raw — сырые мясо и рыба; fresh — без готовки: свежие овощи и зелень.
   */
  method: 'grilled' | 'deep-fried' | 'braised' | 'baked' | 'boiled' | 'cured' | 'raw' | 'fresh';
  /**
   * Текстуры из textures вкусового профиля — только если карточка их проверяет. Нет — карточка текстуру не проверяет.
   *
   * @minItems 1
   */
  textures?: [
    'jelly' | 'slimy' | 'sticky' | 'rubbery' | 'raw' | 'mushy' | 'beads' | 'gristle' | 'chunks',
    ...(
      'jelly' | 'slimy' | 'sticky' | 'rubbery' | 'raw' | 'mushy' | 'beads' | 'gristle' | 'chunks'
    )[]
  ];
  photo: Photo;
}
/**
 * Фото с Wikimedia Commons; лицензия требует указать автора.
 *
 * This interface was referenced by `TasteDeck`'s JSON-Schema
 * via the `definition` "Photo".
 */
export interface Photo {
  /**
   * Страница файла на Wikimedia Commons.
   */
  source: string;
  author: string;
  license: string;
}
