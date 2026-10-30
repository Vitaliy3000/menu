/** Колода анкеты: уникальные id, серии из своего списка, позиции из каталога продуктов. */
import type { TasteDeck } from '../src/types/taste-deck.gen.ts';
import type { Issue } from './data-validation.ts';

export function checkTasteDeck(deck: TasteDeck, file: string, foodIds: Set<string>): Issue[] {
  const issues: Issue[] = [];
  const error = (path: string, message: string) => issues.push({ severity: 'error', file, path, message });

  const seriesIds = new Set<string>();
  deck.series.forEach((s, i) => {
    if (seriesIds.has(s.id)) error(`/series/${i}/id`, `серия «${s.id}» уже есть`);
    seriesIds.add(s.id);
  });

  const cardIds = new Set<string>();
  const used = new Set<string>();
  deck.cards.forEach((card, i) => {
    if (cardIds.has(card.id)) error(`/cards/${i}/id`, `карточка «${card.id}» уже есть`);
    cardIds.add(card.id);
    if (!seriesIds.has(card.series)) error(`/cards/${i}/series`, `неизвестная серия «${card.series}»`);
    used.add(card.series);
    card.foods.forEach((id, j) => {
      if (!foodIds.has(id)) error(`/cards/${i}/foods/${j}`, `неизвестная позиция каталога «${id}»`);
    });
  });

  deck.series.forEach((s, i) => {
    if (!used.has(s.id)) error(`/series/${i}`, `в серии «${s.id}» нет карточек`);
  });
  return issues;
}
