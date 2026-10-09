/**
 * Минимальный роутер на History API с учётом base-пути GitHub Pages.
 * Внутри приложения пути пишутся без base: «/recipes/borsch/».
 */
import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export interface Location {
  /** Путь без base и без завершающего слэша: «/recipes/borsch», «/» для главной. */
  path: string;
  query: URLSearchParams;
}

function readLocation(): Location {
  let path = window.location.pathname;
  if (BASE && path.startsWith(BASE)) path = path.slice(BASE.length);
  path = path.replace(/\/index\.html$/, '').replace(/\/+$/, '') || '/';
  return { path, query: new URLSearchParams(window.location.search) };
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

if (typeof window !== 'undefined') {
  window.history.scrollRestoration = 'manual';
  window.addEventListener('popstate', (e) => {
    notify();
    // Переход по якорю (#раздел) тоже вызывает popstate, но без нашего state — прокрутку не трогаем.
    const y = (e.state as { scrollY?: unknown } | null)?.scrollY;
    if (typeof y === 'number') requestAnimationFrame(() => window.scrollTo(0, y));
  });
}

export function href(path: string): string {
  return BASE + path;
}

export function navigate(to: string, opts: { replace?: boolean } = {}): void {
  // Запоминаем прокрутку текущей страницы, чтобы «назад» вернул на то же место.
  window.history.replaceState({ ...(window.history.state as object), scrollY: window.scrollY }, '');
  if (opts.replace) window.history.replaceState({ scrollY: 0 }, '', href(to));
  else window.history.pushState({ scrollY: 0 }, '', href(to));
  notify();
  if (!opts.replace) window.scrollTo(0, 0);
}

/** Обновляет query-параметры без новой записи в истории. null удаляет параметр. */
export function setQuery(params: Record<string, string | null>): void {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === '') url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  window.history.replaceState(window.history.state, '', url);
  notify();
}

export function useLocation(): Location {
  const [location, setLocation] = useState(readLocation);
  useEffect(() => {
    const update = () => setLocation(readLocation());
    listeners.add(update);
    return () => void listeners.delete(update);
  }, []);
  return location;
}

type LinkProps = Omit<JSX.HTMLAttributes<HTMLAnchorElement>, 'href'> & {
  to: string;
  children?: ComponentChildren;
};

export function Link({ to, onClick, ...rest }: LinkProps) {
  return (
    <a
      href={href(to)}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(to);
      }}
      {...rest}
    />
  );
}

/** Сопоставляет путь с шаблоном вида «/recipes/:id». */
export function match(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean);
  const s = path.split('/').filter(Boolean);
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    const part = p[i]!;
    const seg = s[i]!;
    if (part.startsWith(':')) params[part.slice(1)] = decodeURIComponent(seg);
    else if (part !== seg) return null;
  }
  return params;
}
