/** Подписи и иконки для значений enum из схем. */
import {
  Archive,
  CakeSlice,
  ChefHat,
  Coffee,
  Cookie,
  CookingPot,
  Croissant,
  CupSoda,
  Drumstick,
  EggFried,
  Flame,
  Microwave,
  Package,
  Refrigerator,
  Salad,
  Snowflake,
  Soup,
  Utensils,
  Wheat,
  Wind,
  Wrench,
  type LucideIcon,
} from 'lucide-preact';
import type { Diet, Difficulty, RecipeCategory, ReheatMethod } from '../types/recipe.gen.ts';
import type { EquipmentKind, ShopSection, StorageKind } from '../types/cook-plan.gen.ts';

export interface CategoryMeta {
  label: string;
  /** Множественное число для заголовков фильтра. */
  plural: string;
  icon: LucideIcon;
  /** Имя цветовой темы, см. --plate-* в tokens.css */
  tone: 'tomato' | 'saffron' | 'herb' | 'butter' | 'wheat' | 'plum' | 'crust' | 'olive' | 'sky';
}

export const CATEGORIES: Record<RecipeCategory, CategoryMeta> = {
  breakfast: { label: 'Завтрак', plural: 'Завтраки', icon: EggFried, tone: 'butter' },
  soup: { label: 'Суп', plural: 'Супы', icon: Soup, tone: 'saffron' },
  salad: { label: 'Салат', plural: 'Салаты', icon: Salad, tone: 'herb' },
  main: { label: 'Основное', plural: 'Основные', icon: Drumstick, tone: 'tomato' },
  side: { label: 'Гарнир', plural: 'Гарниры', icon: Wheat, tone: 'olive' },
  pasta: { label: 'Паста', plural: 'Паста', icon: Utensils, tone: 'wheat' },
  baking: { label: 'Выпечка', plural: 'Выпечка', icon: Croissant, tone: 'crust' },
  dessert: { label: 'Десерт', plural: 'Десерты', icon: CakeSlice, tone: 'plum' },
  snack: { label: 'Закуска', plural: 'Закуски', icon: Cookie, tone: 'crust' },
  sauce: { label: 'Соус', plural: 'Соусы', icon: CookingPot, tone: 'tomato' },
  drink: { label: 'Напиток', plural: 'Напитки', icon: CupSoda, tone: 'sky' },
};

export const CATEGORY_ORDER: RecipeCategory[] = [
  'breakfast', 'soup', 'salad', 'main', 'pasta', 'side', 'baking', 'dessert', 'snack', 'sauce', 'drink',
];

export const DIETS: Record<Diet, string> = {
  vegetarian: 'Вегетарианское',
  vegan: 'Веганское',
  pescatarian: 'Пескетарианское',
  'gluten-free': 'Без глютена',
  'dairy-free': 'Без молочного',
};

export const DIFFICULTY: Record<Difficulty, string> = {
  easy: 'Просто',
  medium: 'Средне',
  hard: 'Сложно',
};

export const REHEAT: Record<ReheatMethod['method'], { label: string; icon: LucideIcon }> = {
  stovetop: { label: 'На плите', icon: Flame },
  microwave: { label: 'В микроволновке', icon: Microwave },
  oven: { label: 'В духовке', icon: ChefHat },
  airfryer: { label: 'В аэрогриле', icon: Wind },
  steam: { label: 'На пару', icon: Coffee },
};

export const STORAGE: Record<StorageKind, { label: string; icon: LucideIcon }> = {
  fridge: { label: 'Холодильник', icon: Refrigerator },
  freezer: { label: 'Морозилка', icon: Snowflake },
  pantry: { label: 'Шкаф', icon: Archive },
  serve: { label: 'Подать', icon: Utensils },
};

export const SHOP_SECTIONS: Record<ShopSection, string> = {
  produce: 'Овощи, фрукты, зелень',
  meat: 'Мясо и птица',
  fish: 'Рыба',
  dairy: 'Молочное и яйца',
  bakery: 'Хлеб',
  grocery: 'Бакалея и консервы',
  frozen: 'Заморозка',
  spices: 'Специи',
  other: 'Прочее',
};

export const SHOP_SECTION_ORDER: ShopSection[] = [
  'produce', 'meat', 'fish', 'dairy', 'bakery', 'grocery', 'frozen', 'spices', 'other',
];

export const EQUIPMENT_KINDS: Record<EquipmentKind, { label: string; icon: LucideIcon }> = {
  oven: { label: 'Духовка', icon: ChefHat },
  hob: { label: 'Плита', icon: Flame },
  appliance: { label: 'Техника', icon: Wrench },
  cookware: { label: 'Посуда', icon: CookingPot },
  tool: { label: 'Инструменты', icon: Utensils },
  container: { label: 'Тара', icon: Package },
};

export const EQUIPMENT_ORDER: EquipmentKind[] = ['oven', 'hob', 'appliance', 'cookware', 'tool', 'container'];

/** Цвета блюд в техкарте: назначаются по порядку в dishes. */
export const DISH_TONES = ['tomato', 'herb', 'saffron', 'plum', 'sky', 'olive', 'crust', 'butter'] as const;
