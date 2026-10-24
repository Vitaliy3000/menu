import { Info, Refrigerator, Snowflake, Target } from 'lucide-preact';
import { formatNumber } from '../../lib/format.ts';
import { MEALS } from '../../lib/labels.ts';
import type { PlanProgress } from '../../lib/progress.ts';
import { deviation, type MealLine, personDay, rationToday, thawTonight } from '../../lib/ration.ts';
import { setQuery, useLocation } from '../../lib/router.tsx';
import type { CookPlan, Packaging, Ration as RationData, RationDay, RationPerson } from '../../types/cook-plan.gen.ts';

/** В пределах ±5 % от цели — «в цели». */
const ON_TARGET = 0.05;

interface Props {
  plan: CookPlan;
  ration: RationData;
  tones: Map<string, string>;
  progress: PlanProgress;
}

export function Ration({ plan, ration, tones, progress }: Props) {
  const { query } = useLocation();
  const person = ration.people.find((p) => p.id === query.get('who')) ?? ration.people[0];
  const today = rationToday(progress.startedAt, ration.days.length);
  const dishName = (id: string) => plan.dishes.find((d) => d.id === id)?.name ?? id;

  return (
    <div class="ration">
      <header class="ration-head">
        <div class="tabs" role="tablist" aria-label="Чьё меню">
          {ration.people.map((p, i) => (
            <button key={p.id} type="button" role="tab" aria-selected={p === person} onClick={() => setQuery({ who: i === 0 ? null : p.id })}>
              {p.name}
            </button>
          ))}
        </div>
        <p class="ration-target">
          <Target aria-hidden="true" />
          {targetLabel(person)}
        </p>
        {person.note && <p class="muted ration-note">{person.note}</p>}
      </header>

      <p class="muted ration-hint">
        День 1 — следующий после дня готовки.
        {today && <strong> Сегодня — день {today}.</strong>}
      </p>
      <div class="ration-days" role="tabpanel">
        {ration.days.map((day) => (
          <DayCard
            key={day.day}
            plan={plan}
            ration={ration}
            day={day}
            person={person}
            tones={tones}
            dishName={dishName}
            isToday={day.day === today}
            open={today ? day.day === today : day.day === 1}
          />
        ))}
      </div>
    </div>
  );
}

function targetLabel(person: RationPerson) {
  const { kcal, protein } = person.target;
  return `${formatNumber(kcal)} ккал${protein ? ` · ${formatNumber(protein)} г белка` : ''}`;
}

function DayCard({
  plan,
  ration,
  day,
  person,
  tones,
  dishName,
  isToday,
  open,
}: {
  plan: CookPlan;
  ration: RationData;
  day: RationDay;
  person: RationPerson;
  tones: Map<string, string>;
  dishName: (id: string) => string;
  isToday: boolean;
  open: boolean;
}) {
  const total = personDay(plan, ration, day, person.id);
  const thaw = thawTonight(plan, ration, day, person.id);

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
          <TotalChip person={person} kcal={total.kcal} protein={total.protein} />
        </span>
      </summary>
      <div class="ration-day-body">
        {day.note && (
          <p class="ration-day-note">
            <Info aria-hidden="true" />
            {day.note}
          </p>
        )}
        <ul class="ration-meals">
          {total.lines.map((line, i) => (
            <MealRow key={i} line={line} />
          ))}
          {(thaw.length > 0 || day.evening) && (
            <li class="ration-evening">
              <span class="ration-meal">Вечером</span>
              <span class="ration-item">
                {thaw.length > 0 && <span class="ration-name">Из морозилки — в холодильник, на завтра</span>}
                {thaw.map((line) => (
                  <span key={line.meal} class="ration-detail">
                    {MEALS[line.meal]}: {line.name} · {line.pack.container}
                  </span>
                ))}
                {day.evening && <span class="ration-how">{day.evening}</span>}
              </span>
            </li>
          )}
          <li class="ration-sum">
            <span class="ration-meal">Итого</span>
            <span class="ration-item">
              <span class="ration-detail">цель {targetLabel(person)}</span>
            </span>
            <Macros kcal={total.kcal} protein={total.protein} />
          </li>
        </ul>
      </div>
    </details>
  );
}

function MealRow({ line }: { line: MealLine }) {
  return (
    <li>
      <span class="ration-meal">{MEALS[line.meal]}</span>
      <span class="ration-item">
        <span class="ration-name">{line.name}</span>
        <span class="ration-detail">{line.detail}</span>
        {line.pack && <PackSource pack={line.pack} />}
        {line.how && <span class="ration-how">{line.how}</span>}
      </span>
      <Macros kcal={line.kcal} protein={line.protein} />
    </li>
  );
}

/** Обед и ужин всегда берём в холодильнике: замороженные переложены туда накануне вечером. */
function PackSource({ pack }: { pack: Packaging }) {
  const thawed = pack.storage === 'freezer';
  const Icon = thawed ? Snowflake : Refrigerator;
  return (
    <span class="ration-from">
      <Icon aria-hidden="true" />
      {pack.container} — в холодильнике{thawed && ', переложен из морозилки вчера вечером'}
    </span>
  );
}

function TotalChip({ person, kcal, protein }: { person: RationPerson; kcal: number; protein: number }) {
  const off = deviation(kcal, person.target.kcal);
  const ok = Math.abs(off) <= ON_TARGET && (!person.target.protein || protein >= person.target.protein * (1 - ON_TARGET));
  return (
    <span class={`ration-chip${ok ? ' is-ok' : ' is-off'}`} title={`Цель: ${targetLabel(person)}`}>
      <span class="num">{formatNumber(Math.round(kcal))}</span> ккал
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
