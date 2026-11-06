import { describe, expect, it } from 'vitest';
import { loginSchema } from './login-schema';

describe('loginSchema', () => {
  it('normalizes email whitespace without changing the password', () => {
    const value = loginSchema.parse({
      email: ' pessoa@example.com ',
      password: ' senha com espaços ',
    });
    expect(value).toEqual({
      email: 'pessoa@example.com',
      password: ' senha com espaços ',
    });
  });
  it('rejects invalid email and empty credentials', () => {
    expect(
      loginSchema.safeParse({ email: 'inválido', password: 'senha' }).success,
    ).toBe(false);
    expect(
      loginSchema.safeParse({ email: 'pessoa@example.com', password: '' })
        .success,
    ).toBe(false);
  });
});
