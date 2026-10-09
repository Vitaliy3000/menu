import { describe, expect, it } from 'vitest';
import { formatAmount, formatCountdown, formatDuration, formatRelativeDay, parseDate, plural, roundAmount, typograph } from '../src/lib/format.ts';

const NB = ' ';

describe('plural', () => {
  const forms = ['порция', 'порции', 'порций'] as const;
  it.each([
    [1, 'порция'],
    [2, 'порции'],
    [5, 'порций'],
    [11, 'порций'],
    [21, 'порция'],
    [24, 'порции'],
    [1.5, 'порции'],
  ])('%s → %s', (n, word) => expect(plural(n, forms)).toBe(word));
});

describe('formatAmount', () => {
  it('метрические единицы — десятичной запятой', () => {
    expect(formatAmount(1.5, 'kg')).toBe(`1,5${NB}кг`);
    expect(formatAmount(200, 'ml')).toBe(`200${NB}мл`);
  });

  it('ложки и штуки — простыми дробями, со склонением', () => {
    expect(formatAmount(0.5, 'tsp')).toBe(`½${NB}ч. л.`);
    expect(formatAmount(1.5, 'cup')).toBe(`1½${NB}стакана`);
    expect(formatAmount(5, 'clove')).toBe(`5${NB}зубчиков`);
    expect(formatAmount(1, 'bunch')).toBe(`1${NB}пучок`);
  });

  it('диапазоны', () => {
    expect(formatAmount(2, 'clove', 3)).toBe(`2–3${NB}зубчика`);
    expect(formatAmount(1, 'tbsp', 2)).toBe(`1–2${NB}ст. л.`);
  });
});

describe('roundAmount', () => {
  it('округляет до кухонной точности', () => {
    expect(roundAmount(233.3, 'g')).toBe(235);
    expect(roundAmount(1.666, 'kg')).toBe(1.67);
    expect(roundAmount(1.4, 'pcs')).toBe(1.5);
    expect(roundAmount(1.3, 'clove')).toBe(1.5);
    expect(roundAmount(0.2, 'pcs')).toBe(0.5);
    expect(roundAmount(0.66, 'tbsp')).toBeCloseTo(2 / 3);
    expect(roundAmount(0.1, 'tsp')).toBe(0.25);
  });
});

describe('время и даты', () => {
  it('formatDuration', () => {
    expect(formatDuration(40)).toBe(`40${NB}мин`);
    expect(formatDuration(65)).toBe(`1${NB}ч 05${NB}мин`);
    expect(formatDuration(120)).toBe(`2${NB}ч`);
  });

  it('formatCountdown', () => {
    expect(formatCountdown(65_000)).toBe('1:05');
    expect(formatCountdown(3_725_000)).toBe('1:02:05');
    expect(formatCountdown(-5)).toBe('0:00');
  });

  it('formatRelativeDay', () => {
    const today = parseDate('2026-10-09');
    expect(formatRelativeDay(parseDate('2026-10-09'), today)).toBe('сегодня');
    expect(formatRelativeDay(parseDate('2026-10-10'), today)).toBe('завтра');
    expect(formatRelativeDay(parseDate('2026-10-11'), today)).toBe('через 2 дня');
    expect(formatRelativeDay(parseDate('2026-09-20'), today)).toBe('19 дней назад');
  });
});

describe('typograph', () => {
  it('склеивает числа с единицами, тире и короткие предлоги', () => {
    expect(typograph('Духовку — на 200 °C')).toBe(`Духовку${NB}— на${NB}200${NB}°C`);
    expect(typograph('варить 35 мин и 2 ст. л.')).toBe(`варить 35${NB}мин и${NB}2${NB}ст. л.`);
  });

  it('не трогает слова, начинающиеся как единицы', () => {
    expect(typograph('3 гостя')).toBe('3 гостя');
  });
});
