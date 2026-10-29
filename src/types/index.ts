/** Datas de calendário devem ser serializadas como YYYY-MM-DD, sem conversão de timezone. */
export type CalendarDate = `${number}-${number}-${number}`;
/** Valores monetários futuros devem ser validados como inteiros seguros em centavos. */
export type MoneyCents = number;
