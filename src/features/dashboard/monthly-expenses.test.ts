import { describe, expect, it } from 'vitest';
import { calculateMonthlyExpenses } from './monthly-expenses';
import type { MonthlyData } from './monthly-indicators';

const id = '00000000-0000-4000-8000-000000000001';
const expense: MonthlyData['transactions'][number] = {
  id,
  user_id: id,
  kind: 'expense',
  status: 'pending',
  amount_cents: 57800,
  due_date: '2026-11-06',
  payment_method: 'pix',
  invoice_id: null,
};
describe('monthly total expenses', () => {
  it('includes only the next generated car installment in the current month', () => {
    const car = {
      ...expense,
      recurring_transaction_id: id,
      due_date: '2026-12-06',
    };
    expect(
      calculateMonthlyExpenses(
        [car, { ...car, due_date: '2027-01-06' }],
        '2026-11',
        0,
        '2026-11-06',
      ),
    ).toMatchObject({ total: 57800, upcomingRecurring: 57800 });
    expect(
      calculateMonthlyExpenses([car], '2026-10', 0, '2026-11-06').total,
    ).toBe(0);
  });
  it('does not add the next month when a recurring expense already exists in this month', () => {
    const car = { ...expense, recurring_transaction_id: id };
    expect(
      calculateMonthlyExpenses(
        [
          { ...car, status: 'settled' },
          { ...car, due_date: '2026-12-06' },
        ],
        '2026-11',
        0,
        '2026-11-06',
      ),
    ).toMatchObject({ total: 57800, upcomingRecurring: 0 });
  });
  it('ignores cancelled occurrences and future standalone expenses', () => {
    expect(
      calculateMonthlyExpenses(
        [
          {
            ...expense,
            recurring_transaction_id: id,
            due_date: '2026-12-06',
            status: 'cancelled',
          },
          { ...expense, due_date: '2026-12-06' },
        ],
        '2026-11',
        0,
        '2026-11-06',
      ).total,
    ).toBe(0);
  });
  it('adds pending recurring expenses, settled purchases and the invoice total once', () => {
    expect(
      calculateMonthlyExpenses(
        [
          expense,
          { ...expense, status: 'settled', amount_cents: 1200 },
          {
            ...expense,
            payment_method: 'credit',
            invoice_id: id,
            status: 'posted',
            amount_cents: 3000,
          },
        ],
        '2026-11',
        13500,
      ),
    ).toEqual({
      outsideCredit: 59000,
      invoices: 13500,
      total: 72500,
      upcomingRecurring: 0,
      pendingOutsideCredit: 57800,
    });
  });
  it('excludes cancelled entries, income and other due months', () => {
    expect(
      calculateMonthlyExpenses(
        [
          { ...expense, status: 'cancelled' },
          { ...expense, kind: 'income' },
          { ...expense, due_date: '2026-12-06' },
        ],
        '2026-11',
        0,
      ).total,
    ).toBe(0);
  });
  it('does not decrease total expenses when a pending item is settled', () => {
    expect(calculateMonthlyExpenses([expense], '2026-11', 10500).total).toEqual(
      calculateMonthlyExpenses(
        [{ ...expense, status: 'settled' }],
        '2026-11',
        10500,
      ).total,
    );
  });
  it('rejects unsafe combined totals and negative invoice totals', () => {
    expect(() =>
      calculateMonthlyExpenses(
        [{ ...expense, amount_cents: Number.MAX_SAFE_INTEGER }],
        '2026-11',
        1,
      ),
    ).toThrow();
    expect(() => calculateMonthlyExpenses([], '2026-11', -1)).toThrow();
  });
});
