import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSession, createClient } = vi.hoisted(() => ({
  getSession: vi.fn(),
  createClient: vi.fn(() => ({})),
}));
vi.mock('./client', () => ({ supabase: { auth: { getSession } } }));
vi.mock('@supabase/supabase-js', () => ({ createClient }));
vi.mock('@/lib/validators/environment', () => ({
  environment: {
    success: true,
    data: {
      url: 'https://example.supabase.co',
      publishableKey: 'sb_publishable_example',
    },
  },
}));

import { userClient } from './user-client';

const userId = '10000000-0000-4000-8000-000000000001';
describe('userClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  });

  it('rejects operations from a screen belonging to a previous user', async () => {
    getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'example-token',
          user: { id: '10000000-0000-4000-8000-000000000002' },
        },
      },
      error: null,
    });
    await expect(userClient(userId)).rejects.toMatchObject({ code: 'session' });
    expect(createClient).not.toHaveBeenCalled();
  });

  it('rejects offline writes before creating a request client', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    await expect(userClient(userId)).rejects.toMatchObject({ code: 'offline' });
    expect(getSession).not.toHaveBeenCalled();
  });

  it('rejects a missing authenticated session', async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(userClient(userId)).rejects.toMatchObject({ code: 'session' });
    expect(createClient).not.toHaveBeenCalled();
  });

  it('stops a cancelled read before inspecting the session', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(userClient(userId, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(getSession).not.toHaveBeenCalled();
  });
});
