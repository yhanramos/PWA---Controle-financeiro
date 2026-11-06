import { describe, expect, it } from 'vitest';
import { profileFormSchema } from './profile-schema';

describe('profileFormSchema', () => {
  it('does not forward ownership or currency fields supplied by a form', () => {
    expect(
      profileFormSchema.parse({
        display_name: ' Nome ',
        id: 'another-user',
        currency: 'USD',
      }),
    ).toEqual({ display_name: 'Nome' });
  });
  it('accepts an optional blank name and rejects names over the database limit', () => {
    expect(profileFormSchema.parse({ display_name: '   ' })).toEqual({
      display_name: '',
    });
    expect(
      profileFormSchema.safeParse({ display_name: 'x'.repeat(121) }).success,
    ).toBe(false);
  });
});
