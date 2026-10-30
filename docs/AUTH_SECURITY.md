# Authentication and security boundaries

## Implemented in the client

Email/password login uses Supabase Auth `signInWithPassword`, with React Hook Form/Zod input validation and localized errors. Passwords are passed only to Auth, never logged or stored by application code. The form does not create users, send recovery mail or enable public registration.

`AuthProvider` restores the SDK session, subscribes to auth changes and confirms the user with `getUser(access_token)` before rendering protected routes. Startup, token refresh and failed validation withhold protected content. Authentication callbacks defer network work to avoid the SDK lock. Stale async validation results are discarded after a newer session event or provider unmount.

The SDK persists session tokens in browser localStorage and refreshes them automatically; it does not persist financial query data. This allows refresh/reopening without logging in every time. Browser tokens remain accessible to JavaScript, so avoiding XSS remains essential; this is not an HttpOnly server-cookie architecture. The installed SSR helper is unused in this Vite SPA.

`/login` is public; application routes are wrapped in RequireAuth. The original internal destination is restored after login and constrained to local paths. Protected components remount on account change. QueryClient is cleared on logout, session loss, failed verification and identity change. Future remote queries must additionally include userId in keys and pass abort signals to fetches. RLS remains mandatory even with client route guards.

Logout uses `scope: local`: it signs out the current session, not all other devices. The UI reports failures and requires connectivity instead of claiming a successful remote logout offline. Revocation of refresh tokens does not instantly invalidate every already issued access JWT. See [Supabase signOut](https://supabase.com/docs/reference/javascript/auth-signout).

## The four layers

| Layer                                | Current implementation                                                                           | Remaining work                                                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Credentials outside Git              | `.env.local` ignored; `.env.example` empty; Supabase temporary directories ignored               | Store future backend secrets in Supabase Secrets / deployment secret settings                                                  |
| RLS in the database                  | Initial SQL contains user-scoped policies and ownership foreign keys                             | Apply migration and verify isolation with two accounts; not executed here                                                      |
| Backend authorization and validation | Supabase Auth verifies login; SQL defines constraints and policies                               | Implement financial RPCs/Edge Functions validating JWT, input, ownership, idempotency and confirmations before enabling writes |
| Public versus privileged access      | Browser env validation accepts only modern `sb_publishable_` keys; no privileged key is required | Keep service-role/secret/Gemini keys exclusively server-side; never trust a model or client-supplied user_id                   |

The folder `supabase/` contains versioned source and is safe to track when it has no real credentials or production dumps. SQL tests contain synthetic fixtures only. SQL Editor runs as an administrator and does not demonstrate end-user RLS behavior.

## First local login

1. Keep the supplied URL and publishable key in `.env.local`, then restart the local dev server.
2. In Supabase, check that email/password authentication is enabled.
3. Create the initial account through **Authentication → Users → Add user**, with an email/password you control; use a confirmed email for this initial manually managed account. No account is created by this implementation.
4. Open `/login` and enter those credentials. A successful Auth session redirects to the intended internal page.

The Auth account exists independently of application tables. Applying the initial SQL creates/backfills its profile and default categories. This implementation does not query the profile or financial tables yet, so a successful login does not prove the migration was applied.

In a single-user deployment, disable public signups in Supabase if you do not want additional registrations. Hiding a signup form does not disable the Auth API. Do not change remote configuration without an explicit deployment decision.

## Verification status

TypeScript and ESLint were checked locally during implementation. The user confirmed successful real login on 2026-10-30. Regression cases for route gating and input validation are authored but not executed. No build, test command, RLS access test or production deployment was run. Recovery, signup UI, MFA, profile integration and financial persistence remain outside this change. Successful login does not validate database policies or all session lifecycle scenarios.

References: [password login](https://supabase.com/docs/reference/javascript/auth-signinwithpassword), [auth events](https://supabase.com/docs/reference/javascript/auth-onauthstatechange), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
