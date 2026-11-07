import { describe, expect, it } from 'vitest';
import { monthlyRecurrenceRequest } from './monthly-recurrence';

describe('monthly recurrence from transactions', () => {
  it('anchors income to its receipt date without requiring a due date', () => {
    const request = monthlyRecurrenceRequest(
      { kind: 'income', received_on: '2026-12-04' },
      '2026-11-06',
    );
    expect(request.values.starts_on).toBe('2026-12-04');
    expect(request.until).toBe('2027-11-04');
  });
  it('uses the due date as the monthly anchor and includes twelve occurrences', () => {
    const request = monthlyRecurrenceRequest(
      { due_date: '2026-11-06' },
      '2026-11-06',
    );
    expect(request.values).toMatchObject({
      starts_on: '2026-11-06',
      interval_unit: 'month',
      interval_count: '1',
      ends_on: '',
    });
    expect(request.until).toBe('2027-10-06');
  });
  it('respects an optional final date', () => {
    expect(
      monthlyRecurrenceRequest(
        { due_date: '2026-11-06', ends_on: '2027-02-06' },
        '2026-11-06',
      ).until,
    ).toBe('2027-02-06');
  });
  it('clamps a February horizon without changing the original monthly anchor', () => {
    const request = monthlyRecurrenceRequest(
      { due_date: '2027-03-31' },
      '2027-03-01',
    );
    expect(request.until).toBe('2028-02-29');
    expect(request.values.starts_on).toBe('2027-03-31');
  });
  it('rejects reversed dates and horizons beyond backend limits before creation', () => {
    expect(() =>
      monthlyRecurrenceRequest(
        { due_date: '2026-11-06', ends_on: '2026-10-06' },
        '2026-11-06',
      ),
    ).toThrow();
    expect(() =>
      monthlyRecurrenceRequest({ due_date: '2030-11-06' }, '2026-11-06'),
    ).toThrow();
  });
});
