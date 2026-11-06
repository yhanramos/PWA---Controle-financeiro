import { describe, expect, it } from 'vitest';
import { calculateRemainingBalance } from './remaining-balance';

describe('balance after pending bills', () => {
  it('subtracts pending expenses and outstanding invoices', () => {
    expect(calculateRemainingBalance(500000, 218400, 57800)).toEqual({
      pending: 276200,
      remaining: 223800,
    });
  });
  it('keeps remaining balance stable when cash and pending expenses decrease after payment', () => {
    expect(calculateRemainingBalance(500000, 218400, 57800).remaining).toBe(
      calculateRemainingBalance(281600, 0, 57800).remaining,
    );
  });
  it('allows negative balances and rejects unsafe subtraction', () => {
    expect(calculateRemainingBalance(100, 200, 0).remaining).toBe(-100);
    expect(() =>
      calculateRemainingBalance(Number.MIN_SAFE_INTEGER, 1, 0),
    ).toThrow();
    expect(() => calculateRemainingBalance(100, -1, 0)).toThrow();
  });
});
