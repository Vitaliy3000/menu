import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { useTimerAlarm } from '../lib/timers.ts';
import { Link, useLocation } from '../lib/router.tsx';
import { TimerTray } from './TimerTray.tsx';

export function Layout({ children }: { children: ComponentChildren }) {
  useTimerAlarm();
  const { path } = useLocation();
  const scrolled = useScrolled();
  const section = path.startsWith('/plans') ? 'plans' : 'recipes';

  return (
    <>
      <header class={`site-header${scrolled ? ' is-scrolled' : ''}`}>
        <div class="container">
          <Link to="/" class="brand" aria-label="Меню — на главную">
            <span class="brand-mark" aria-hidden="true" />
            Меню
          </Link>
          <nav class="nav" aria-label="Разделы">
            <Link to="/" aria-current={section === 'recipes' ? 'page' : undefined}>
              Рецепты
            </Link>
            <Link to="/plans/" aria-current={section === 'plans' ? 'page' : undefined}>
              Техкарты
            </Link>
          </nav>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer class="site-footer">
        <div class="container">
          <span>Меню — рецепты и техкарты дней готовки</span>
          <span>Данные: data/*.json · схемы: schemas/</span>
        </div>
      </footer>
      <TimerTray />
    </>
  );
}

function useScrolled(): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return scrolled;
}
