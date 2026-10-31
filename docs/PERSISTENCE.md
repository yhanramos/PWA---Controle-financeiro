# Stage 2 persistence

## Remote schema evidence — 2026-10-30

The user confirmed successful execution of the initial SQL. Supabase CLI, authenticated by the user, generated `src/lib/supabase/database.types.ts` directly from the remote `public` schema. The generated file contains all twelve expected tables and their relationships; it is not hand-written or inferred from mocks.

The read-only metadata query in `supabase/inspection/schema-security.sql` confirmed:

- RLS enabled on all twelve application tables, with authenticated ownership policies using auth.uid().
- No anonymous SELECT, INSERT, UPDATE or DELETE table privileges.
- No authenticated DELETE/TRUNCATE table privileges.
- profiles grants UPDATE only on display_name.
- The Auth initialization trigger and application audit/timestamp/validation triggers are present.

This is configuration inspection, not a two-user isolation test. No test command, fixture insertion, financial write, migration reapplication or real profile edit was performed. Behavioral RLS tests and browser validation remain pending under the project's no-test/no-build instruction.

## Data flow

UI → feature hook → feature service → per-operation user client → Supabase REST under the user's JWT → PostgreSQL constraints, grants and RLS.

Both the main Auth client and the unused SSR helper use the generated Database generic. Queries use explicit user filters as well as RLS. Runtime Zod schemas validate profile/category responses; generated types alone do not validate network data or prove permissions.

`userClient(expectedUserId, signal)` checks connectivity and session identity before returning a typed data-only client. It captures one access token per operation instead of silently switching a pending write to another account. This client has no persistent auth storage. Local session fields are used only as a preliminary guard; the Supabase API validates the JWT and RLS enforces ownership. It does not expose administrative credentials.

Query keys include the user ID. Reads propagate TanStack Query abort signals. AuthProvider clears the cache on logout/session loss/account change. Profile mutation success invalidates existing user-scoped queries rather than re-creating old cache entries after logout. No mutation is queued offline or automatically retried.

## Delivered behavior

- Settings: load the current user's real profile, edit only display_name and show success only after a returned persisted row. Currency/timezone are read-only.
- Missing profile: explicit state with retry; no fabricated profile or client-side upsert bypassing the Auth trigger.
- Header: shows the saved name when available, otherwise the authenticated email initial.
- Categories: paginated real reads and separate income/expense filters, including inactive markers. No hardcoded default rows in the frontend.
- Shared data errors: localized messages for expired session, permission denial, missing schema, invalid input, conflict and unavailable service. Database error details and credentials are not logged or rendered.

Financial CRUD, atomic installment/invoice operations, recurrence generation and category editing remain Stage 3. The current real persistence mutation is profile-name editing; this change does not expose generic financial writes.

## Regenerating types

Use Node 22.12+ and a recent npm. Authenticate the CLI locally with `npx supabase login`; never put its personal access token in frontend environment variables or source files.

PowerShell, from the project root:

```powershell
$types = npx supabase gen types typescript --project-id mxiewkfyaxoxfaavudes --schema public
if ($LASTEXITCODE -ne 0) { throw 'Type generation failed; existing types preserved.' }
$source = ($types -join "`n") + "`n"
if ($source -notmatch 'export type Database') { throw 'Unexpected CLI output.' }
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'src/lib/supabase/database.types.ts'), $source, [System.Text.UTF8Encoding]::new($false))
```

Review changes after every applied migration. The project reference is public metadata, not a credential. The existing migration was applied manually, so reconcile migration history before using CLI db push; do not blindly apply the initial migration again.

Reference: [Supabase generated types](https://supabase.com/docs/guides/api/rest/generating-types).
