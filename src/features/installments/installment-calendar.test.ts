import { describe, expect, it } from 'vitest';
import { firstUnpaidDates } from './installment-calendar';

describe('first unpaid invoice dates', () => {
  it('uses this cycle before closing and the next cycle on closing', () => {
    const card = { closing_day: 10, due_day: 20 };
    expect(firstUnpaidDates('2026-11-09', 0, card)).toEqual({
      first_close: '2026-11-10',
      first_due: '2026-11-20',
    });
    expect(firstUnpaidDates('2026-11-10', 0, card)).toEqual({
      first_close: '2026-12-10',
      first_due: '2026-12-20',
    });
  });
  it('moves due dates to the next month and crosses years', () => {
    expect(
      firstUnpaidDates('2026-12-15', 0, { closing_day: 20, due_day: 5 }),
    ).toEqual({ first_close: '2026-12-20', first_due: '2027-01-05' });
    expect(
      firstUnpaidDates('2026-12-15', 0, { closing_day: 20, due_day: 20 })
        .first_due,
    ).toBe('2027-01-20');
  });
  it('keeps the next invoice in December when one installment was already paid', () => {
    expect(
      firstUnpaidDates('2026-11-06', 1, { closing_day: 1, due_day: 7 }),
    ).toEqual({ first_close: '2026-12-01', first_due: '2026-12-07' });
  });
  it('does not postpone the next invoice for historical payments', () => {
    expect(
      firstUnpaidDates('2026-01-01', 2, { closing_day: 31, due_day: 5 }),
    ).toEqual({ first_close: '2026-01-31', first_due: '2026-02-05' });
    const card = { closing_day: 1, due_day: 7 };
    expect(firstUnpaidDates('2026-11-06', 9, card)).toEqual(
      firstUnpaidDates('2026-11-06', 0, card),
    );
  });
  it('clamps short months and respects leap years', () => {
    expect(
      firstUnpaidDates('2028-02-01', 0, { closing_day: 30, due_day: 31 }),
    ).toEqual({ first_close: '2028-02-29', first_due: '2028-02-29' });
    expect(
      firstUnpaidDates('2027-02-28', 0, { closing_day: 31, due_day: 5 }),
    ).toEqual({ first_close: '2027-03-31', first_due: '2027-04-05' });
  });
  it('rejects invalid calendars, dates and historical counts', () => {
    expect(() =>
      firstUnpaidDates('2026-02-30', 0, { closing_day: 10, due_day: 20 }),
    ).toThrow();
    expect(() =>
      firstUnpaidDates('2026-11-01', -1, { closing_day: 10, due_day: 20 }),
    ).toThrow();
    expect(() =>
      firstUnpaidDates('2026-11-01', 0, { closing_day: 0, due_day: 20 }),
    ).toThrow();
  });
});
