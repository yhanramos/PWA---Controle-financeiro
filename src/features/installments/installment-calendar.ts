import { z } from 'zod';

export const cardCalendarSchema = z.object({
  closing_day: z.number().int().min(1).max(31),
  due_day: z.number().int().min(1).max(31),
});

// Work from month starts and clamp days only after selecting the billing cycle.
function dateAt(year: number, month: number, day: number) {
  const end = new Date(0);
  end.setUTCFullYear(year, month + 1, 0);
  const date = new Date(0);
  date.setUTCFullYear(year, month, Math.min(day, end.getUTCDate()));
  return z.iso.date().parse(date.toISOString().slice(0, 10));
}

export function firstUnpaidDates(
  purchasedOn: string,
  historical: number,
  calendar: z.infer<typeof cardCalendarSchema>,
) {
  z.iso.date().parse(purchasedOn);
  z.number().int().min(0).max(599).parse(historical);
  const { closing_day, due_day } = cardCalendarSchema.parse(calendar);
  const [year, month] = purchasedOn.split('-').map(Number);
  let closeMonth = month - 1;
  if (purchasedOn >= dateAt(year, closeMonth, closing_day)) closeMonth++;
  // Historical payments affect installment numbering, not the next billing cycle.
  return {
    first_close: dateAt(year, closeMonth, closing_day),
    first_due: dateAt(
      year,
      closeMonth + (due_day <= closing_day ? 1 : 0),
      due_day,
    ),
  };
}
