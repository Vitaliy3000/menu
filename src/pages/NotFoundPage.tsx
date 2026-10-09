import { UtensilsCrossed } from 'lucide-preact';
import { Link } from '../lib/router.tsx';

export function NotFoundPage() {
  return (
    <div class="container page">
      <div class="empty">
        <span class="plate tone-tomato">
          <UtensilsCrossed />
        </span>
        <h1 class="display h2">Такой страницы нет</h1>
        <p>Возможно, рецепт переименовали или техкарту удалили.</p>
        <div class="chip-wrap" style={{ justifyContent: 'center' }}>
          <Link to="/" class="btn btn-dark">
            К рецептам
          </Link>
          <Link to="/plans/" class="btn btn-quiet">
            К техкартам
          </Link>
        </div>
      </div>
    </div>
  );
}
