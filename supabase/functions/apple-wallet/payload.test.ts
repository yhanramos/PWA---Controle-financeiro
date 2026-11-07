import { describe, expect, it } from 'vitest';
import { amountInCents, purchaseSchema } from './payload';

describe('Apple Wallet payload', () => {
  const purchase = {
    event_id: '10000000-0000-4000-8000-000000000001',
    card: 'Cartão Inter',
    merchant: 'Mercado',
    amount: '35,90',
    currency: 'BRL',
    occurred_on: '2026-11-07',
  };
  it('converts decimals without floating-point rounding', () => {
    expect(amountInCents('35,90')).toBe('3590');
    expect(amountInCents('0.01')).toBe('1');
    expect(amountInCents('90071992547409.91')).toBe('9007199254740991');
    expect(() => amountInCents('90071992547409.92')).toThrow();
    expect(() => amountInCents('0')).toThrow();
  });
  it('rejects unsupported currency, grouped numbers and impossible dates', () => {
    expect(purchaseSchema.safeParse(purchase).success).toBe(true);
    for (const patch of [
      { currency: 'USD' },
      { amount: '1.234,56' },
      { amount: 35.9 },
      { amount: '1.005' },
      { occurred_on: '2026-02-30' },
      { card: '' },
      { user_id: 'injected' },
      { event_id: 'not-a-uuid' },
    ])
      expect(purchaseSchema.safeParse({ ...purchase, ...patch }).success).toBe(
        false,
      );
  });
});
