import { Info } from 'lucide-preact';
import { SectionNav } from '../components/SectionNav.tsx';
import { kitchen } from '../data/index.ts';
import { AVOID_LEVELS, AVOID_ORDER, STORAGE_PLACES } from '../lib/kitchen.ts';
import { DISH_TONES, EQUIPMENT_KINDS, EQUIPMENT_ORDER } from '../lib/labels.ts';
import type { Person } from '../types/kitchen.gen.ts';
import { NotFoundPage } from './NotFoundPage.tsx';

const SECTIONS = [
  { id: 'people', label: 'Кто что не ест' },
  { id: 'equipment', label: 'Оборудование' },
  { id: 'storage', label: 'Хранение' },
];

export function KitchenPage() {
  if (!kitchen) return <NotFoundPage />;
  const k = kitchen;

  return (
    <div class="container page kitchen">
      <header class="page-head">
        <h1 class="display h1">Кухня</h1>
        <p class="lead">
          Справочник для составления техкарт: кто что не ест, чем готовим и куда убираем. Техкарты на него не
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
    </article>
  );
}
