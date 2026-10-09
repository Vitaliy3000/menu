import { useEffect, useRef, useState } from 'preact/hooks';

export interface SectionLink {
  id: string;
  label: string;
}

/**
 * Липкая строка разделов страницы. Кнопки (а не #якоря): прокрутка не трогает URL и роутер,
 * а текущий раздел подсвечивается по мере чтения.
 */
export function SectionNav({ sections, label, always = false }: { sections: SectionLink[]; label: string; always?: boolean }) {
  const [active, setActive] = useState<string | null>(null);
  const nav = useRef<HTMLElement>(null);
  // После нажатия держим выбранный раздел, пока идёт плавная прокрутка к нему.
  const lockUntil = useRef(0);

  // Подсвеченная плашка не должна уезжать за край горизонтальной ленты (двигаем только ленту, не страницу).
  useEffect(() => {
    const row = nav.current;
    const button = row?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!row || !button) return;
    const left = button.offsetLeft - row.offsetLeft;
    if (left < row.scrollLeft || left + button.offsetWidth > row.scrollLeft + row.clientWidth) {
      row.scrollTo({ left: left - 16, behavior: 'smooth' });
    }
  }, [active]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      if (Date.now() < lockUntil.current) return;
      const offset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      let current: string | null = null;
      for (const { id } of sections) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top - offset <= 8) current = id;
      }
      // Долистали до конца — подсвечиваем последний раздел, даже если он короткий.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        current = sections[sections.length - 1]?.id ?? current;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [sections.map((s) => s.id).join()]);

  const go = (id: string) => {
    setActive(id);
    lockUntil.current = Date.now() + 1500;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <nav ref={nav} class={`section-nav${always ? ' is-always' : ''}`} aria-label={label}>
      {sections.map((s) => (
        <button key={s.id} type="button" aria-current={active === s.id ? 'true' : undefined} onClick={() => go(s.id)}>
          {s.label}
        </button>
      ))}
    </nav>
  );
}
