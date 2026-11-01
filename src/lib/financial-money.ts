import { z } from 'zod';

export const moneyInput = z.string().trim().regex(/^-?\d+(?:,\d{1,2})?$/, 'Informe um valor como 1234,56.').transform((value, ctx) => {
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = value.replace('-', '').split(',');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) { ctx.addIssue({code:'custom',message:'Valor acima do limite permitido.'}); return z.NEVER; }
  return Number(negative ? -cents : cents);
});
export const positiveMoneyInput = moneyInput.refine(value => value > 0, 'Informe um valor positivo.');
export function formatMoney(cents: number) {
  if (!Number.isSafeInteger(cents)) throw new Error('Valor monetário inválido.');
  return new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(cents / 100);
}
