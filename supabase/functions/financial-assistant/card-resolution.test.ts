import { describe, expect, it } from 'vitest';
import { resolveCardName } from './card-resolution';

const inter = { id: 'inter', name: 'Cartão Inter' };
const nubank = { id: 'nubank', name: 'Cartão Nubank' };

describe('card names used in expense messages', () => {
  it('resolves Inter to Cartão Inter among other cards', () => {
    expect(resolveCardName([inter, nubank], 'inter')).toBe(inter);
    expect(resolveCardName([inter, nubank], 'BANCO INTER')).toBe(inter);
    expect(resolveCardName([inter, nubank], 'cartao   inter')).toBe(inter);
  });
  it('asks for clarification when the short name matches multiple cards', () => {
    const black = { id: 'black', name: 'Cartão Inter Black' };
    expect(resolveCardName([inter, black], 'Inter')).toBeUndefined();
    expect(resolveCardName([inter, black], 'Inter Black')).toBe(black);
    expect(resolveCardName([inter, black], 'Cartão Inter')).toBe(inter);
  });
  it('does not match fragments, unknown names or generic words', () => {
    expect(
      resolveCardName([{ id: 'other', name: 'Internacional' }], 'Inter'),
    ).toBeUndefined();
    expect(resolveCardName([inter], 'Itaú')).toBeUndefined();
    expect(resolveCardName([inter], 'cartão')).toBeUndefined();
    expect(resolveCardName([inter], '')).toBeUndefined();
  });
  it('defaults only when the name is omitted and there is one card', () => {
    expect(resolveCardName([inter], null)).toBe(inter);
    expect(resolveCardName([inter, nubank], null)).toBeUndefined();
    expect(resolveCardName([], null)).toBeUndefined();
    expect(
      resolveCardName([inter, { ...inter, id: 'duplicate' }], 'Cartão Inter'),
    ).toBeUndefined();
  });
});
