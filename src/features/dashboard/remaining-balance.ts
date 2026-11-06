import { DataError } from '@/services/data-error';

export function calculateRemainingBalance(
  cash: number,
  expenses: number,
  invoices: number,
) {
  if (
    ![cash, expenses, invoices].every(Number.isSafeInteger) ||
    expenses < 0 ||
    invoices < 0
  )
    throw new DataError(
      'schema',
      'Não foi possível validar o saldo após as contas.',
    );
  const pending = BigInt(expenses) + BigInt(invoices);
  const remaining = BigInt(cash) - pending;
  if (
    pending > BigInt(Number.MAX_SAFE_INTEGER) ||
    remaining < BigInt(Number.MIN_SAFE_INTEGER)
  )
    throw new DataError(
      'schema',
      'Saldo após as contas acima do limite de cálculo permitido.',
    );
  return { pending: Number(pending), remaining: Number(remaining) };
}
