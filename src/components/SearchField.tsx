import { Search, X } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';

export function SearchField(props: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  const { value, onChange } = props;
  // Локальное состояние + отложенная запись в URL: Safari ограничивает частоту history.replaceState.
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  useEffect(() => {
    if (text === value) return;
    const id = window.setTimeout(() => onChange(text), 200);
    return () => window.clearTimeout(id);
  }, [text]);

  return (
    <div class="search" role="search">
      <Search aria-hidden="true" />
      <input
        type="search"
        placeholder={props.placeholder}
        value={text}
        onInput={(e) => setText(e.currentTarget.value)}
        aria-label={props.label}
        enterKeyHint="search"
        autoComplete="off"
      />
      {text && (
        <button
          class="icon-btn"
          type="button"
          onClick={() => {
            setText('');
            onChange('');
          }}
          aria-label="Очистить поиск"
        >
          <X />
        </button>
      )}
    </div>
  );
}
