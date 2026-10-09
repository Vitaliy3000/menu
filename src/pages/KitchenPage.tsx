import { Check, Copy, FileJson, Flame, Info, Microwave, Snowflake } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { SectionNav } from '../components/SectionNav.tsx';
import { kitchen } from '../data/index.ts';
import { AVOID_LEVELS, AVOID_ORDER, CONSUMABLE_KINDS, CONSUMABLE_ORDER, kitchenToMarkdown, STORAGE_PLACES } from '../lib/kitchen.ts';
import { DISH_TONES, EQUIPMENT_KINDS, EQUIPMENT_ORDER } from '../lib/labels.ts';
import { href } from '../lib/router.tsx';
import type { Consumable, Kitchen, Person } from '../types/kitchen.gen.ts';
import { NotFoundPage } from './NotFoundPage.tsx';

const SECTIONS = [
  { id: 'people', label: 'Кто что не ест' },
  { id: 'equipment', label: 'Оборудование' },
  { id: 'consumables', label: 'Расходники' },
  { id: 'storage', label: 'Хранение' },
  { id: 'pantry', label: 'Всегда дома' },
  { id: 'rules', label: 'Правила' },
];

export function KitchenPage() {
  if (!kitchen) return <NotFoundPage />;
  const k = kitchen;

  return (
    <div class="container page kitchen">
      <header class="page-head">
        <h1 class="display h1">Кухня</h1>
        <p class="lead">
          Справочник для составления техкарт: кто что не ест, чем готовим, во что фасуем и куда убираем. Техкарты на него не
          ссылаются — он нужен, чтобы не повторять всё это в каждом промпте.
        </p>
        {k.draft && (
          <div class="callout callout-info kitchen-draft">
            <Info aria-hidden="true" />
            <span>
              <strong>Черновик.</strong> Пока здесь данные-пример — замените их в <code>data/kitchen.json</code> и уберите
              <code>"draft": true</code>.
            </span>
          </div>
        )}
      </header>

      <PromptPanel kitchen={k} />

      <SectionNav label="Разделы справочника" sections={SECTIONS} always />

      <section id="people" class="kitchen-section">
        <h2 class="display h2 section-heading">Кто что не ест</h2>
        <div class="people-grid">
          {k.people.map((p, i) => (
            <PersonCard key={p.id} person={p} tone={DISH_TONES[i % DISH_TONES.length]!} />
          ))}
        </div>
      </section>

      <section id="equipment" class="kitchen-section">
        <h2 class="display h2 section-heading">Оборудование</h2>
        <div class="equipment-groups">
          {EQUIPMENT_ORDER.map((kind) => {
            const items = k.equipment.filter((e) => e.kind === kind);
            if (items.length === 0) return null;
            const { label, icon: Icon } = EQUIPMENT_KINDS[kind];
            return (
              <div key={kind} class="equipment-group">
                <h3 class="info-title">
                  <Icon aria-hidden="true" />
                  {label}
                </h3>
                <ul>
                  {items.map((e) => (
                    <li key={e.id}>
                      <span class="equipment-name">
                        {e.name}
                        {e.count && e.count > 1 && <span class="faint num"> × {e.count}</span>}
                      </span>
                      {e.spec && <span class="equipment-spec">{e.spec}</span>}
                      {e.note && <span class="equipment-note">{e.note}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section id="consumables" class="kitchen-section">
        <h2 class="display h2 section-heading">Расходники</h2>
        <div class="consumable-groups">
          {CONSUMABLE_ORDER.map((kind) => {
            const items = k.consumables.filter((c) => c.kind === kind);
            if (items.length === 0) return null;
            const { label, icon: Icon } = CONSUMABLE_KINDS[kind];
            return (
              <section key={kind} class="card consumable-group">
                <h3 class="info-title">
                  <Icon aria-hidden="true" />
                  {label}
                </h3>
                <ul>
                  {items.map((c) => (
                    <ConsumableRow key={c.id} item={c} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </section>

      <section id="storage" class="kitchen-section">
        <h2 class="display h2 section-heading">Хранение</h2>
        <div class="storage-grid">
          {k.storage.map((s) => {
            const { icon: Icon } = STORAGE_PLACES[s.kind];
            return (
              <article key={s.id} class={`card card-pad storage-card storage-${s.kind}`}>
                <span class="pack-icon">
                  <Icon aria-hidden="true" />
                </span>
                <h3 class="display h3">{s.name}</h3>
                {s.capacity && <p class="storage-capacity">{s.capacity}</p>}
                {s.free && (
                  <p class="storage-free">
                    <span class="eyebrow">Свободно</span>
                    {s.free}
                  </p>
                )}
                {s.note && <p class="muted storage-note">{s.note}</p>}
              </article>
            );
          })}
        </div>
      </section>

      <section id="pantry" class="kitchen-section">
        <h2 class="display h2 section-heading">Всегда дома</h2>
        <p class="muted section-hint">В закупку техкарты не попадает — или помечается как «обычно есть дома».</p>
        <div class="pantry-groups">
          {k.pantry.map((g) => (
            <div key={g.title} class="pantry-group">
              <h3 class="info-title">{g.title}</h3>
              <div class="chip-wrap">
                {g.items.map((item) => (
                  <span key={item} class="tag">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="rules" class="kitchen-section">
        <h2 class="display h2 section-heading">Правила для техкарт</h2>
        <ol class="rules">
          {k.rules.map((rule, i) => (
            <li key={i}>
              <span class="rule-num num">{i + 1}</span>
              <p>{rule}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function PersonCard({ person, tone }: { person: Person; tone: string }) {
  return (
    <article class={`card card-pad person-card tone-${tone}`}>
      <header class="person-head">
        <span class="person-avatar" aria-hidden="true">
          {person.name.charAt(0)}
        </span>
        <h3 class="display h3">{person.name}</h3>
      </header>
      {AVOID_ORDER.map((level) => {
        const items = person.avoid.filter((a) => a.level === level);
        if (items.length === 0) return null;
        return (
          <div key={level} class={`avoid-group avoid-${level}`}>
            <p class="avoid-level">
              <span class="avoid-badge">{AVOID_LEVELS[level].label}</span>
              <span class="faint">{AVOID_LEVELS[level].hint}</span>
            </p>
            <ul>
              {items.map((a) => (
                <li key={a.item}>
                  <span class="avoid-item">{a.item}</span>
                  {a.note && <span class="avoid-note">{a.note}</span>}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {person.avoid.length === 0 && <p class="muted">Ест всё.</p>}
      {person.notes && person.notes.length > 0 && (
        <ul class="bullets person-notes">
          {person.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

function ConsumableRow({ item }: { item: Consumable }) {
  const flags = [
    item.freezer && { key: 'freezer', icon: Snowflake, label: 'Можно в морозилку' },
    item.microwave && { key: 'microwave', icon: Microwave, label: 'Можно в микроволновку' },
    item.oven && { key: 'oven', icon: Flame, label: 'Можно в духовку' },
  ].filter((f): f is { key: string; icon: typeof Snowflake; label: string } => Boolean(f));

  return (
    <li class="consumable">
      <span class="consumable-main">
        <span class="consumable-name">{item.name}</span>
        {item.spec && <span class="consumable-spec">{item.spec}</span>}
        {item.note && <span class="consumable-note">{item.note}</span>}
      </span>
      <span class="consumable-side">
        {item.stock && <span class="consumable-stock num">{item.stock}</span>}
        {flags.length > 0 && (
          <span class="consumable-flags">
            {flags.map((f) => (
              <span key={f.key} class={`flag flag-${f.key}`} title={f.label}>
                <f.icon aria-label={f.label} />
              </span>
            ))}
          </span>
        )}
      </span>
    </li>
  );
}

function PromptPanel({ kitchen: k }: { kitchen: Kitchen }) {
  const [copied, setCopied] = useState(false);
  const absolute = (path: string) => new URL(href(path), window.location.origin).href;
  const links = { planSchema: absolute('/schemas/cook-plan.schema.json'), kitchenJson: absolute('/kitchen.json') };

  const copy = async () => {
    const text = kitchenToMarkdown(k, links);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Старые браузеры и не-https: через скрытое поле.
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section class="prompt-panel" aria-label="Для промпта">
      <div class="prompt-text">
        <h2 class="display h3">Для промпта</h2>
        <p>
          Скопируйте справочник одним текстом и вставьте в запрос на составление техкарты. Или дайте ссылки на JSON справочника и
          схему техкарты.
        </p>
      </div>
      <div class="prompt-actions">
        <button type="button" class="btn btn-primary" onClick={copy}>
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copied ? 'Скопировано' : 'Скопировать для промпта'}
        </button>
        <a class="btn btn-quiet" href={href('/kitchen.json')} target="_blank" rel="noreferrer">
          <FileJson aria-hidden="true" />
          kitchen.json
        </a>
        <a class="btn btn-quiet" href={href('/schemas/cook-plan.schema.json')} target="_blank" rel="noreferrer">
          <FileJson aria-hidden="true" />
          Схема техкарты
        </a>
      </div>
    </section>
  );
}
