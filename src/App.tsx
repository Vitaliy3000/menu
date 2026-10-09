import type { JSX } from 'preact';
import { useEffect } from 'preact/hooks';
import { Layout } from './components/Layout.tsx';
import { getPlan, getRecipe } from './data/index.ts';
import { match, useLocation } from './lib/router.tsx';
import { KitchenPage } from './pages/KitchenPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { PlanPage } from './pages/PlanPage.tsx';
import { PlansPage } from './pages/PlansPage.tsx';
import { RecipePage } from './pages/RecipePage.tsx';
import { RecipesPage } from './pages/RecipesPage.tsx';

export function App() {
  const { path } = useLocation();
  const page = route(path);

  useEffect(() => {
    document.title = page.title ? `${page.title} — Меню` : 'Меню — рецепты и техкарты';
  }, [page.title]);

  return <Layout>{page.view}</Layout>;
}

const notFound = { title: 'Страница не найдена', view: <NotFoundPage /> };

function route(path: string): { title: string | null; view: JSX.Element } {
  if (path === '/') return { title: null, view: <RecipesPage /> };
  if (path === '/plans') return { title: 'Техкарты', view: <PlansPage /> };
  if (path === '/kitchen') return { title: 'Кухня', view: <KitchenPage /> };

  const recipeId = match('/recipes/:id', path)?.id;
  if (recipeId) {
    const recipe = getRecipe(recipeId);
    return recipe ? { title: recipe.title, view: <RecipePage key={recipe.id} recipe={recipe} /> } : notFound;
  }

  const planId = match('/plans/:id', path)?.id;
  if (planId) {
    const plan = getPlan(planId);
    return plan ? { title: plan.title, view: <PlanPage key={plan.id} plan={plan} /> } : notFound;
  }

  return notFound;
}
