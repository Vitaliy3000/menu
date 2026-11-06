/** Смысловые проверки рациона техкарты: ссылки, порции, фасовка обедов и ужинов, сверка дней с целями. */
import { cookingDayMeals, deviation, type PersonDay, personDay } from '../src/lib/ration.ts';
import type { CookPlan, Ration, RationExtra, RationPerson } from '../src/types/cook-plan.gen.ts';
import { checkMacros, round, uniqueIds } from './validation-helpers.ts';

/** Допустимое отклонение дня от цели по калориям; белок — не меньше цели на столько же. */
export const RATION_TOLERANCE = 0.1;

export function checkRation(
  p: CookPlan,
  ration: Ration,
  dishes: Set<string>,
  error: (path: string, message: string) => void,
  warn: (path: string, message: string) => void,
) {
  const people = uniqueIds(ration.people, '/ration/people', error);
  uniqueIds(ration.extras, '/ration/extras', error);
  const usedExtras = new Set<string>();

  ration.people.forEach((person, i) => {
    const seen = new Set<string>();
    person.portions.forEach((portion, j) => {
      const path = `/ration/people/${i}/portions/${j}`;
      if (!dishes.has(portion.dish)) error(`${path}/dish`, `нет блюда с id «${portion.dish}»`);
      if (seen.has(portion.dish)) error(`${path}/dish`, `порция «${portion.dish}» у ${person.name} указана дважды`);
      seen.add(portion.dish);
      if (portion.reheat.active > portion.reheat.total) {
        error(`${path}/reheat/active`, `разогрев «${portion.dish}» у ${person.name}: руками ${portion.reheat.active} мин — больше, чем всего (${portion.reheat.total})`);
      }
      const kcalIssue = checkMacros(portion);
      if (kcalIssue) warn(path, kcalIssue);
    });
  });

  // КБЖУ порций рациона показываются в карточке блюда — второе значение в dish.nutrition разойдётся с ними.
  p.dishes.forEach((dish, i) => {
    if (dish.nutrition && ration.people.some((person) => person.portions.some((x) => x.dish === dish.id))) {
      warn(`/dishes/${i}/nutrition`, `КБЖУ блюда «${dish.id}» уже заданы в порциях рациона — nutrition лишний`);
    }
  });

  ration.extras.forEach((extra, i) => {
    const seen = new Set<string>();
    extra.servings.forEach((serving, j) => {
      const path = `/ration/extras/${i}/servings/${j}/person`;
      if (!people.has(serving.person)) error(path, `нет человека с id «${serving.person}»`);
      if (seen.has(serving.person)) error(path, `«${serving.person}» в «${extra.id}» указан дважды`);
      seen.add(serving.person);
    });
  });

  const checkExtra = (id: string, meal: RationExtra['meal'], path: string) => {
    usedExtras.add(id);
    const extra = ration.extras.find((e) => e.id === id);
    if (!extra) error(path, `нет позиции extras с id «${id}»`);
    else if (extra.meal !== meal) error(path, `«${id}» — ${MEAL_NAMES[extra.meal][0]}, а стоит в ${MEAL_NAMES[meal][1]}`);
  };

  ration.days.forEach((day, i) => {
    const path = `/ration/days/${i}`;
    if (day.day !== i + 1) error(`${path}/day`, `дни должны идти подряд с 1-го: на месте ${i + 1}-го стоит ${day.day}-й`);
    day.breakfast?.forEach((id, j) => checkExtra(id, 'breakfast', `${path}/breakfast/${j}`));
    const daySnacks = new Set<string>();
    for (const slot of ['morning', 'afternoon', 'evening'] as const) {
      day.snacks?.[slot]?.forEach((id, j) => {
        checkExtra(id, 'snack', `${path}/snacks/${slot}/${j}`);
        if (daySnacks.has(id)) error(`${path}/snacks/${slot}/${j}`, `«${id}» уже стоит в другом перекусе дня ${day.day}`);
        daySnacks.add(id);
      });
    }
    for (const meal of ['lunch', 'dinner'] as const) {
      const id = day[meal];
      if (!dishes.has(id)) {
        error(`${path}/${meal}`, `нет блюда с id «${id}»`);
        continue;
      }
      ration.people.forEach((person) => {
        if (!person.portions.some((x) => x.dish === id)) error(`${path}/${meal}`, `у ${person.name} нет порции блюда «${id}»`);
      });
    }

    ration.people.forEach((person) => {
      const total = personDay(p, ration, day, person.id);
      if (day.breakfast) checkOneMeal(total, 'breakfast', person, `день ${day.day}`, `${path}/breakfast`, error);
      checkTarget(total, person, `день ${day.day}`, path, warn);
    });
  });

  const cooking = ration.cookingDay;
  if (cooking) {
    const path = '/ration/cookingDay';
    for (const meal of COOKING_DAY_MEALS) cooking[meal].forEach((id, j) => checkExtra(id, meal, `${path}/${meal}/${j}`));
    ration.people.forEach((person) => {
      const total = cookingDayMeals(ration, cooking, person.id);
      for (const meal of COOKING_DAY_MEALS) checkOneMeal(total, meal, person, 'день 0', `${path}/${meal}`, error);
    });
  }

  ration.extras.forEach((extra, i) => {
    if (!usedExtras.has(extra.id)) warn(`/ration/extras/${i}`, `«${extra.id}» не стоит ни в одном дне рациона`);
  });

  checkPackedMeals(p, ration, people, error);
  if (!p.cooked) checkMeals(p, ration, error);
}

const COOKING_DAY_MEALS = ['breakfast', 'lunch', 'dinner'] as const;

/** Каждому — ровно один завтрак, а в день готовки — ещё и один обед и один ужин. */
function checkOneMeal(
  total: PersonDay,
  meal: RationExtra['meal'],
  person: RationPerson,
  label: string,
  path: string,
  error: (path: string, message: string) => void,
) {
  const count = total.lines.find((line) => line.slot === meal)?.items.length ?? 0;
  if (count !== 1) error(path, `${label}: у ${person.name} ${MEAL_NAMES[meal][2]} ${count}, а нужен один`);
}

function checkTarget(total: PersonDay, person: RationPerson, label: string, path: string, warn: (path: string, message: string) => void) {
  const off = deviation(total.kcal, person.target.kcal);
  if (Math.abs(off) > RATION_TOLERANCE) {
    warn(path, `${label}, ${person.name}: ${round(total.kcal)} ккал при цели ${person.target.kcal} (${off > 0 ? '+' : ''}${Math.round(off * 100)} %)`);
  }
  const protein = person.target.protein;
  if (protein && total.protein < protein * (1 - RATION_TOLERANCE)) {
    warn(path, `${label}, ${person.name}: белка ${round(total.protein)} г при цели ${protein} г`);
  }
}

/** Им. п., где стоит, сколько их: «завтрак», «в завтраке», «завтраков 2». */
const MEAL_NAMES: Record<RationExtra['meal'], readonly [string, string, string]> = {
  breakfast: ['завтрак', 'завтраке', 'завтраков'],
  lunch: ['обед', 'обеде', 'обедов'],
  dinner: ['ужин', 'ужине', 'ужинов'],
  snack: ['перекус', 'перекусах', 'перекусов'],
};
const DINNER_HANDS_MAX = 15;
const DINNER_TOTAL_MAX = 20;

/** Блюдо — либо обед, либо ужин: обед греют только в микроволновке на работе, ужин — как основное блюдо в ресторане: до тарелки не дольше 20 минут, у плиты и руками — не дольше 15. */
function checkMeals(p: CookPlan, ration: Ration, error: (path: string, message: string) => void) {
  const meals = new Map(p.dishes.map((dish) => [dish.id, dish.meal]));
  p.dishes.forEach((dish, i) => {
    if (!dish.meal && ration.days.some((day) => day.lunch === dish.id || day.dinner === dish.id)) {
      error(`/dishes/${i}/meal`, `у блюда «${dish.id}» нет meal: обед это или ужин`);
    }
  });
  ration.days.forEach((day, i) => {
    for (const meal of ['lunch', 'dinner'] as const) {
      const actual = meals.get(day[meal]);
      if (actual && actual !== meal) {
        error(`/ration/days/${i}/${meal}`, `«${day[meal]}» — ${MEAL_NAMES[actual][0]}, а стоит в ${MEAL_NAMES[meal][1]} дня ${day.day}`);
      }
    }
  });
  ration.people.forEach((person, i) => {
    person.portions.forEach((portion, j) => {
      const path = `/ration/people/${i}/portions/${j}/reheat`;
      const meal = meals.get(portion.dish);
      const { methods, active, total } = portion.reheat;
      if (meal === 'lunch' && methods.some((m) => m !== 'microwave')) {
        error(`${path}/methods`, `обед «${portion.dish}» у ${person.name} греют только в микроволновке`);
      }
      if (meal === 'dinner' && active > DINNER_HANDS_MAX) {
        error(`${path}/active`, `ужин «${portion.dish}» у ${person.name} — ${active} мин у плиты и руками, а можно не больше ${DINNER_HANDS_MAX}`);
      }
      if (meal === 'dinner' && total > DINNER_TOTAL_MAX) {
        error(`${path}/total`, `ужин «${portion.dish}» у ${person.name} — ${total} мин до тарелки, а можно не больше ${DINNER_TOTAL_MAX}`);
      }
    });
  });
}

/** Каждый обед и ужин рациона лежит ровно в одном контейнере своего блюда и своего человека: по фасовке рацион показывает, откуда его взять. */
function checkPackedMeals(p: CookPlan, ration: Ration, people: Set<string>, error: (path: string, message: string) => void) {
  const mealName = (meal: 'lunch' | 'dinner') => (meal === 'lunch' ? 'обед' : 'ужин');
  const slot = (dish: string, person: string, day: number, meal: string) => `${dish}/${person}/${day}/${meal}`;
  const packed = new Map<string, number>();

  p.dishes.forEach((dish, i) => {
    dish.packaging.forEach((pack, j) => {
      const { person, meals } = pack;
      if (!person || !meals) return;
      const path = `/dishes/${i}/packaging/${j}`;
      if (!people.has(person)) error(`${path}/person`, `нет человека с id «${person}»`);
      if (meals.length !== pack.count) error(`${path}/meals`, `приёмов пищи ${meals.length}, а контейнеров ${pack.count}`);
      meals.forEach((m, k) => {
        if (ration.days[m.day - 1]?.[m.meal] !== dish.id) {
          error(`${path}/meals/${k}`, `в рационе на ${mealName(m.meal)} дня ${m.day} не «${dish.id}»`);
        }
        const key = slot(dish.id, person, m.day, m.meal);
        packed.set(key, (packed.get(key) ?? 0) + 1);
      });
    });
  });

  ration.days.forEach((day, i) => {
    for (const meal of ['lunch', 'dinner'] as const) {
      ration.people.forEach((person) => {
        const count = packed.get(slot(day[meal], person.id, day.day, meal)) ?? 0;
        const what = `${mealName(meal)} дня ${day.day} у ${person.name}`;
        if (count === 0) error(`/ration/days/${i}/${meal}`, `${what} не лежит ни в одном контейнере — добавьте его в meals фасовки «${day[meal]}»`);
        if (count > 1) error(`/ration/days/${i}/${meal}`, `${what} лежит в ${count} контейнерах`);
      });
    }
  });
}
