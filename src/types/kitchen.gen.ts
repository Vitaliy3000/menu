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
 * container — контейнеры и формы, bag — пакеты, wrap — фольга, плёнка, пергамент, label — маркировка, other — прочее.
 *
 * This interface was referenced by `Kitchen`'s JSON-Schema
 * via the `definition` "ConsumableKind".
 */
export type ConsumableKind = 'container' | 'bag' | 'wrap' | 'label' | 'other';
/**
 * This interface was referenced by `Kitchen`'s JSON-Schema
 * via the `definition` "StorageKind".
 */
export type StorageKind = 'fridge' | 'freezer' | 'pantry';

/**
 * Справочник кухни: кто что не ест, оборудование, расходники, места хранения, что всегда есть дома и правила. На него опираются при составлении техкарт (CookPlan) вне сайта — чтобы не повторять всё это в каждом промпте. Техкарты на справочник не ссылаются и остаются самодостаточными.
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
   * Техника и многоразовая посуда, которые есть на кухне.
   */
  equipment: KitchenEquipment[];
  /**
   * Одноразовые расходники: контейнеры, пакеты, фольга, плёнка, пергамент, маркировка.
   */
  consumables: Consumable[];
  /**
   * Где храним готовое и сколько там места.
   */
  storage: StoragePlace[];
  /**
   * Что обычно уже есть дома — в закупку техкарты не попадает или помечается staple.
   */
  pantry: PantryGroup[];
  /**
   * Правила составления техкарт: ограничения по времени, порциям, заморозке, маркировке.
   */
  rules: string[];
}
/**
 * This interface was referenced by `Kitchen`'s JSON-Schema
 * via the `definition` "Person".
 */
export interface Person {
  id: LocalId;
  name: string;
  avoid: AvoidItem[];
  /**
   * Прочее о питании: «обед с собой пн–пт», «не ест после 21:00».
   */
  notes?: string[];
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
 * via the `definition` "Consumable".
 */
export interface Consumable {
  id: LocalId;
  name: string;
  kind: ConsumableKind;
  /**
   * Объём, размер, материал: «750 мл, PP, с крышкой».
   */
  spec?: string;
  /**
   * Сколько обычно есть дома: «≈ 20 шт», «1 рулон 30 м».
   */
  stock?: string;
  /**
   * Можно в морозилку.
   */
  freezer?: boolean;
  /**
   * Можно в микроволновку.
   */
  microwave?: boolean;
  /**
   * Можно в духовку.
   */
  oven?: boolean;
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
/**
 * This interface was referenced by `Kitchen`'s JSON-Schema
 * via the `definition` "PantryGroup".
 */
export interface PantryGroup {
  title: string;
  /**
   * @minItems 1
   */
  items: [string, ...string[]];
}
