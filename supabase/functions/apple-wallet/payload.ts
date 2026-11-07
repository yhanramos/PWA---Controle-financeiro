import { z } from 'zod';

export const purchaseSchema = z
  .object({
    event_id: z.uuid(),
    card: z.string().trim().min(1).max(200),
    merchant: z.string().trim().min(1).max(180),
    // Explicit BRL only; never infer currency or accept grouped/rounded amounts.
    currency: z.literal('BRL'),
    amount: z.string().regex(/^\d{1,14}([.,]\d{1,2})?$/),
    occurred_on: z.iso.date(),
  })
  .strict();

export function amountInCents(amount: string): string {
  const [whole, fraction = ''] = amount.replace(',', '.').split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (cents < 1n || cents > 9007199254740991n)
    throw new Error('Valor inválido.');
  return cents.toString();
}

export const managementSchema = z
  .object({
    action: z.enum(['status', 'rotate', 'revoke', 'save', 'remove']),
    alias: z.string().trim().min(1).max(200).optional(),
    card_id: z.uuid().optional(),
    category_id: z.uuid().optional(),
  })
  .strict();
