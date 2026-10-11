import { CATEGORIES } from '../lib/labels.ts';
import { href } from '../lib/router.tsx';
import type { Recipe } from '../types/recipe.gen.ts';

/** Миниатюра рецепта: фото, если есть, иначе «тарелка» с иконкой категории. Без size размер задаёт CSS (--size). */
export function Plate({ recipe, size }: { recipe: Recipe; size?: number }) {
  const style = size ? { '--size': `${size}px` } : undefined;
  if (recipe.image) {
    const src = /^https?:/.test(recipe.image.src) ? recipe.image.src : href(`/${recipe.image.src.replace(/^\//, '')}`);
    return <img class="plate-img" src={src} alt={recipe.image.alt} style={style} loading="lazy" />;
  }
  const { icon: Icon, tone } = CATEGORIES[recipe.category];
  return (
    <span class={`plate tone-${tone}`} style={style} aria-hidden="true">
      <Icon />
    </span>
  );
}
