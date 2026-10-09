import type { ComponentChildren } from 'preact';
import { X } from 'lucide-preact';
import { useEffect } from 'preact/hooks';

/** Нижний лист для мобильных: закрывается по фону, Esc и крестику. */
export function Sheet(props: { title: string; onClose: () => void; footer?: ComponentChildren; children: ComponentChildren }) {
  const { title, onClose, footer, children } = props;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <>
      <div class="sheet-backdrop" onClick={onClose} />
      <div class="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div class="sheet-handle" />
        <div class="sheet-head">
          <h2 class="display h3">{title}</h2>
          <button class="icon-btn" type="button" onClick={onClose} aria-label="Закрыть">
            <X />
          </button>
        </div>
        <div class="sheet-body">{children}</div>
        {footer && <div class="sheet-foot">{footer}</div>}
      </div>
    </>
  );
}
