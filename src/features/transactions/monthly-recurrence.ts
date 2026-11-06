import { z } from 'zod';
import { currentDate } from '@/lib/utils/calendar';

export function monthlyRecurrenceRequest(
  values: Record<string, string>,
  today = currentDate(),
) {
  const start = z.iso
    .date()
    .parse(values.kind === 'income' ? values.received_on : values.due_date);
  const end = values.ends_on ? z.iso.date().parse(values.ends_on) : '';
  if (end && end < start)
    throw new Error('A data final deve ser posterior à primeira ocorrência.');
  const [year, month, day] = start.split('-').map(Number);
  const last = new Date(0);
  last.setUTCFullYear(year, month + 11, 0);
  const horizon = new Date(0);
  horizon.setUTCFullYear(year, month + 10, Math.min(day, last.getUTCDate()));
  const until = z.iso.date().parse(horizon.toISOString().slice(0, 10));
  const max = new Date(`${today}T00:00:00Z`);
  max.setUTCFullYear(max.getUTCFullYear() + 2);
  const limitedUntil = end && end < until ? end : until;
  if (limitedUntil > max.toISOString().slice(0, 10))
    throw new Error(
      'Escolha um primeiro vencimento mais próximo: o limite de geração é de dois anos à frente.',
    );
  return {
    values: {
      ...values,
      starts_on: start,
      ends_on: end,
      interval_unit: 'month',
      interval_count: '1',
    },
    until: limitedUntil,
  };
}
