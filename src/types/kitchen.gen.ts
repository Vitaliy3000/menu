/* Сгенерировано из schemas/kitchen.schema.json — не редактировать вручную. Обновить: npm run types */

/**
 * Идентификатор внутри справочника.
 *
 * This interface was referenced by `Kitchen`'s JSON-Schema
 * via the `definition` "LocalId".
 */
export type LocalId = string;
/**
 * allergy — аллергия, нельзя даже следов; never — не ест совсем; dislike — не любит, лучше обойтись или подать отдельно.
 *
 * This interface was referenced by `Kitchen`'s JSON-Schema
 * via the `definition` "AvoidLevel".
 */
export type AvoidLevel = 'allergy' | 'never' | 'dislike';
/**
 * This interface was referenced by `Kitchen`'s JSON-Schema
 * via the `definition` "EquipmentKind".
 */
export type EquipmentKind = 'oven' | 'hob' | 'appliance' | 'cookware' | 'tool' | 'container';
/**
 * This interface was referenced by `Kitchen`'s JSON-Schema
 * via the `definition` "StorageKind".
 */
export type StorageKind = 'fridge' | 'freezer' | 'pantry';

/**
 * Справочник кухни: кто что не ест, правила составления техкарт, оборудование и места хранения. На него опираются при составлении техкарт (CookPlan) вне сайта — чтобы не повторять всё это в каждом промпте. Техкарты на справочник не ссылаются и остаются самодостаточными.
 */
export interface Kitchen {
  /**
   * Путь к схеме для подсказок в редакторе. На сайт не влияет.
   */
  $schema?: string;
  /**
   * true — данные-пример, сайт покажет пометку «черновик».
   */
  draft?: boolean;
  /**
   * Для кого готовим и что каждый не ест.
   *
   * @minItems 1
   */
  people: [Person, ...Person[]];
  /**
   * Правила составления техкарт по темам: продукты, питание, приёмы пищи, время и техника, фасовка.
   */
  planRules?: RuleGroup[];
  /**
   * Техника и многоразовая посуда, которые есть на кухне.
   */
  equipment: KitchenEquipment[];
  /**
   * Где храним готовое и сколько там места.
   */
  storage: StoragePlace[];
}
/**
 * This interface was referenced by `Kitchen`'s JSON-Schema
 * via the `definition` "Person".
 */
export interface Person {
  id: LocalId;
  name: string;
  avoid: AvoidItem[];
}
/**
 * This interface was referenced by `Kitchen`'s JSON-Schema
 * via the `definition` "AvoidItem".
 */
export interface AvoidItem {
  /**
   * Продукт или группа продуктов: «Кинза», «Субпродукты».
   */
  item: string;
  level: AvoidLevel;
  /**
   * Чем заменить, в каком виде всё-таки можно.
   */
  note?: string;
}
/**
 * Группа правил на одну тему.
 *
 * This interface was referenced by `Kitchen`'s JSON-Schema
 * via the `definition` "RuleGroup".
 */
export interface RuleGroup {
  /**
   * Тема: «Питание», «Время и техника».
   */
  title: string;
  /**
   * Правила — по одному на строку.
   *
   * @minItems 1
   */
  rules: [string, ...string[]];
}
/**
 * This interface was referenced by `Kitchen`'s JSON-Schema
 * via the `definition` "KitchenEquipment".
 */
export interface KitchenEquipment {
  id: LocalId;
  name: string;
  kind: EquipmentKind;
  count?: number;
  /**
   * Характеристики: «60 л, конвекция, 2 уровня», «Ø 28 см».
   */
  spec?: string;
  /**
   * Ограничения и особенности: «только посуда с магнитным дном».
   */
  note?: string;
}
/**
 * This interface was referenced by `Kitchen`'s JSON-Schema
 * via the `definition` "StoragePlace".
 */
export interface StoragePlace {
  id: LocalId;
  name: string;
  kind: StorageKind;
  /**
   * Объём и устройство: «≈ 60 л, 3 ящика».
   */
  capacity?: string;
  /**
   * Сколько обычно свободно под заготовки.
   */
  free?: string;
  note?: string;
}
