import { z } from 'zod';
import { DataError } from '@/services/data-error';
import { TIME_ZONE } from '@/lib/utils/calendar';

const cents = z
  .number()
  .int()
  .min(Number.MIN_SAFE_INTEGER)
  .max(Number.MAX_SAFE_INTEGER);
export const cashAccountSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  opening_balance_cents: cents,
  opening_balance_date: z.iso.date(),
});
export const cashTransactionSchema = z.object({
  user_id: z.uuid(),
  account_id: z.uuid().nullable(),
  amount_cents: cents.nonnegative(),
  kind: z.enum(['income', 'expense']),
  status: z.enum(['pending', 'settled', 'posted', 'cancelled']),
  payment_method: z.string(),
  settled_on: z.iso.date().nullable(),
});
export const cashPaymentSchema = z.object({
  user_id: z.uuid(),
  account_id: z.uuid(),
  amount_cents: cents.nonnegative(),
  status: z.enum(['confirmed', 'reversed']),
  paid_on: z.iso.date(),
});

export function cashReferenceDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (name: string) => parts.find((p) => p.type === name)?.value;
  return z.iso.date().parse(`${part('year')}-${part('month')}-${part('day')}`);
}

function safeNumber(value: bigint) {
  if (
    value > BigInt(Number.MAX_SAFE_INTEGER) ||
    value < BigInt(Number.MIN_SAFE_INTEGER)
  )
    throw new DataError(
      'schema',
      'Saldo acima do limite de cálculo permitido.',
    );
  return Number(value);
}

/** Current corrected cash position, not an audit reconstruction of a past month. */
export function calculateCashBalance(
  accounts: z.infer<typeof cashAccountSchema>[],
  transactions: z.infer<typeof cashTransactionSchema>[],
  payments: z.infer<typeof cashPaymentSchema>[],
  referenceDate: string,
) {
  z.iso.date().parse(referenceDate);
  const eligible = new Map(
    accounts
      .filter((a) => a.opening_balance_date <= referenceDate)
      .map((a) => [a.id, a]),
  );
  let opening = 0n,
    income = 0n,
    expenses = 0n,
    invoicePayments = 0n;
  for (const account of eligible.values())
    opening += BigInt(account.opening_balance_cents);
  const checkAccount = (id: string | null, date: string) => {
    const account = id ? eligible.get(id) : undefined;
    if (!account || date < account.opening_balance_date)
      throw new DataError(
        'schema',
        'Há movimentações incompatíveis com a data inicial da conta.',
      );
  };
  for (const tx of transactions) {
    if (tx.status !== 'settled' || tx.payment_method === 'credit') continue;
    if (!tx.settled_on)
      throw new DataError('schema', 'Lançamento liquidado sem data efetiva.');
    if (tx.settled_on > referenceDate) continue;
    checkAccount(tx.account_id, tx.settled_on);
    if (tx.kind === 'income') income += BigInt(tx.amount_cents);
    else expenses += BigInt(tx.amount_cents);
  }
  for (const payment of payments) {
    if (payment.status !== 'confirmed' || payment.paid_on > referenceDate)
      continue;
    checkAccount(payment.account_id, payment.paid_on);
    invoicePayments += BigInt(payment.amount_cents);
  }
  return {
    referenceDate,
    accountCount: eligible.size,
    opening: safeNumber(opening),
    income: safeNumber(income),
    expenses: safeNumber(expenses),
    invoicePayments: safeNumber(invoicePayments),
    balance: safeNumber(opening + income - expenses - invoicePayments),
  };
}
