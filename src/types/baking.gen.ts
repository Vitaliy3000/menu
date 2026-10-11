/* Сгенерировано из schemas/baking.schema.json — не редактировать вручную. Обновить: npm run types */

/**
 * This interface was referenced by `Baking`'s JSON-Schema
 * via the `definition` "GuidePoint".
 */
export type GuidePoint = string | GuidePointDetail;

/**
 * Справочник раздела «Выпечка»: руководства (например, по формовому хлебу), что купить для домашней пекарни и что испечь дальше. Рецептуры (Bake) на него не ссылаются.
 */
export interface Baking {
  /**
   * Путь к схеме для подсказок в редакторе. На сайт не влияет.
   */
  $schema?: string;
  /**
   * Руководства: каждое — отдельный раздел страницы «Выпечка».
   */
  guides: Guide[];
  /**
   * Что купить: инвентарь, мука и продукты, сгруппированные по смыслу.
   */
  shopping: ShoppingGroup[];
  /**
   * Что испечь дальше: идеи и ссылки, по которым ещё нет рецептуры.
   */
  ideas?: Idea[];
}
/**
 * This interface was referenced by `Baking`'s JSON-Schema
 * via the `definition` "Guide".
 */
export interface Guide {
  /**
   * Уникальный идентификатор — якорь раздела на странице.
   */
  id: string;
  title: string;
  /**
   * О чём руководство, одно-два предложения.
   */
  summary: string;
  /**
   * @minItems 1
   */
  sections: [GuideSection, ...GuideSection[]];
}
/**
 * Раздел руководства. Нужен вводный текст, пункты или и то и другое.
 *
 * This interface was referenced by `Baking`'s JSON-Schema
 * via the `definition` "GuideSection".
 */
export interface GuideSection {
  title: string;
  /**
   * Вводный абзац.
   */
  text?: string;
  /**
   * Пункты: строка или пункт с заголовком, текстом и подпунктами.
   *
   * @minItems 1
   */
  points?: [GuidePoint, ...GuidePoint[]];
}
export interface GuidePointDetail {
  title: string;
  text?: string;
  /**
   * @minItems 1
   */
  points?: [string, ...string[]];
}
/**
 * This interface was referenced by `Baking`'s JSON-Schema
 * via the `definition` "ShoppingGroup".
 */
export interface ShoppingGroup {
  title: string;
  note?: string;
  /**
   * @minItems 1
   */
  items: [ShoppingItem, ...ShoppingItem[]];
}
/**
 * This interface was referenced by `Baking`'s JSON-Schema
 * via the `definition` "ShoppingItem".
 */
export interface ShoppingItem {
  /**
   * Что купить. Не повторяется внутри справочника.
   */
  name: string;
  /**
   * Размер, зачем нужно, на что обратить внимание.
   */
  note?: string;
  /**
   * Взаимозаменяемые варианты: «гастроёмкость GN 1/1», «baking cloche».
   *
   * @minItems 2
   */
  options?: [string, string, ...string[]];
}
/**
 * This interface was referenced by `Baking`'s JSON-Schema
 * via the `definition` "Idea".
 */
export interface Idea {
  title: string;
  note?: string;
  /**
   * @minItems 1
   */
  links?: [
    {
      name: string;
      url: string;
    },
    ...{
      name: string;
      url: string;
    }[]
  ];
}
