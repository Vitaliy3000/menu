import { Lightbulb, Target } from 'lucide-preact';
import { formatNumber } from '../../lib/format.ts';
import type { PlanProgress } from '../../lib/progress.ts';
import { deviation, type MealKind, personDay, rationToday } from '../../lib/ration.ts';
import type { CookPlan, Ration as RationData, RationDay, RationPerson } from '../../types/cook-plan.gen.ts';

const MEALS: Record<MealKind, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
};

/** В пределах ±5 % от цели — «в цели». */
const ON_TARGET = 0.05;

interface Props {
  plan: CookPlan;
  ration: RationData;
  tones: Map<string, string>;
  progress: PlanProgress;
}

export function Ration({ plan, ration, tones, progress }: Props) {
  const today = rationToday(progress.startedAt, ration.days.length);
  const dishName = (id: string) => plan.dishes.find((d) => d.id === id)?.name ?? id;

  return (
    <div class="ration">
      <section>
        <h2 class="display h2 section-heading">Кто что ест</h2>
        <div class="ration-people">
          {ration.people.map((person) => (
            <PersonCard key={person.id} person={person} ration={ration} tones={tones} dishName={dishName} />
          ))}
        </div>
      </section>

      <section class="section">
        <h2 class="display h2 section-heading">По дням</h2>
        <p class="muted ration-hint">
          День 1 — следующий после дня готовки. Перекусы подобраны под обед и ужин дня так, чтобы итог совпал с целью.
          {today && <strong> Сегодня — день {today}.</strong>}
        </p>
        <div class="ration-days">
          {ration.days.map((day) => (
            <DayCard
              key={day.day}
              plan={plan}
              ration={ration}
              day={day}
              tones={tones}
              dishName={dishName}
              isToday={day.day === today}
              open={today ? day.day === today : day.day === 1}
            />
          ))}
        </div>
      </section>

      {ration.notes && ration.notes.length > 0 && (
        <section class="section">
          <ul class="tips">
            {ration.notes.map((n, i) => (
              <li key={i}>
                <Lightbulb aria-hidden="true" />
                <p>{n}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function targetLabel(person: RationPerson) {
  const { kcal, protein } = person.target;
  return `${formatNumber(kcal)} ккал${protein ? ` · ${formatNumber(protein)} г белка` : ''}`;
}

function PersonCard({
  person,
  ration,
  tones,
  dishName,
}: {
  person: RationPerson;
  ration: RationData;
  tones: Map<string, string>;
  dishName: (id: string) => string;
}) {
  const extras = ration.extras.flatMap((e) => {
    const serving = e.servings.find((s) => s.person === person.id);
    return serving ? [{ extra: e, serving }] : [];
  });

  return (
    <article class="card card-pad ration-person">
      <header>
        <h3 class="display h3">{person.name}</h3>
        <p class="ration-target">
          <Target aria-hidden="true" />
          {targetLabel(person)}
        </p>
        {person.note && <p class="muted ration-note">{person.note}</p>}
      </header>
      <div>
        <h4 class="info-title">Порции блюд</h4>
        <ul class="ration-list">
          {person.portions.map((p) => (
            <li key={p.dish} class={`tone-${tones.get(p.dish)}`}>
              <span class="dot" />
              <span class="ration-item">
                <span class="ration-name">{dishName(p.dish)}</span>
                <span class="ration-detail">{p.size}</span>
              </span>
              <Macros kcal={p.kcal} protein={p.protein} />
            </li>
          ))}
        </ul>
      </div>
      {extras.length > 0 && (
        <div>
          <h4 class="info-title">Завтраки и перекусы</h4>
          <ul class="ration-list">
            {extras.map(({ extra, serving }) => (
              <li key={extra.id}>
                <span class="dot" />
                <span class="ration-item">
                  <span class="ration-name">
                    {extra.name}
                    <span class="faint"> · {MEALS[extra.meal].toLowerCase()}</span>
                  </span>
                  <span class="ration-detail">{serving.text}</span>
                </span>
                <Macros kcal={serving.kcal} protein={serving.protein} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

function DayCard({
  plan,
  ration,
  day,
  tones,
  dishName,
  isToday,
  open,
}: {
  plan: CookPlan;
  ration: RationData;
  day: RationDay;
  tones: Map<string, string>;
  dishName: (id: string) => string;
  isToday: boolean;
  open: boolean;
}) {
  const people = ration.people.map((person) => ({ person, total: personDay(plan, ration, day, person.id) }));

  return (
    <details class={`card ration-day${isToday ? ' is-today' : ''}`} open={open}>
      <summary>
        <span class="ration-day-head">
          <span class="display ration-day-num">День {day.day}</span>
          {isToday && <span class="badge badge-accent">сегодня</span>}
        </span>
        <span class="ration-day-dishes">
          <span class={`tone-${tones.get(day.lunch)}`}>
            <span class="dot" /> {dishName(day.lunch)}
          </span>
          <span class={`tone-${tones.get(day.dinner)}`}>
            <span class="dot" /> {dishName(day.dinner)}
          </span>
        </span>
        <span class="ration-day-totals">
          {people.map(({ person, total }) => (
            <TotalChip key={person.id} person={person} kcal={total.kcal} protein={total.protein} />
          ))}
        </span>
      </summary>
      <div class="ration-day-body">
        {day.note && <p class="muted">{day.note}</p>}
        {people.map(({ person, total }) => (
          <div key={person.id} class="ration-day-person">
            <h4 class="info-title">{person.name}</h4>
            <ul class="ration-meals">
              {total.lines.map((line, i) => (
                <li key={i}>
                  <span class="ration-meal">{MEALS[line.meal]}</span>
                  <span class="ration-item">
                    <span class="ration-name">{line.name}</span>
                    <span class="ration-detail">{line.detail}</span>
                  </span>
                  <Macros kcal={line.kcal} protein={line.protein} />
                </li>
              ))}
              <li class="ration-sum">
                <span class="ration-meal">Итого</span>
                <span class="ration-item">
                  <span class="ration-detail">цель {targetLabel(person)}</span>
                </span>
                <Macros kcal={total.kcal} protein={total.protein} />
              </li>
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}

function TotalChip({ person, kcal, protein }: { person: RationPerson; kcal: number; protein: number }) {
  const off = deviation(kcal, person.target.kcal);
  const ok = Math.abs(off) <= ON_TARGET && (!person.target.protein || protein >= person.target.protein * (1 - ON_TARGET));
  return (
    <span class={`ration-chip${ok ? ' is-ok' : ' is-off'}`} title={`Цель: ${targetLabel(person)}`}>
      {person.name} <span class="num">{formatNumber(Math.round(kcal))}</span>
    </span>
  );
}

function Macros({ kcal, protein }: { kcal: number; protein: number }) {
  return (
    <span class="ration-macros num">
      {formatNumber(Math.round(kcal))} ккал
      <span class="faint"> · Б {formatNumber(Math.round(protein))}</span>
    </span>
  );
}
