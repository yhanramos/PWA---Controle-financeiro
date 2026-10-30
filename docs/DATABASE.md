# Database — initial schema

The first migration is `supabase/migrations/20261029000100_initial_schema.sql`. It has **not been applied to a remote Supabase project or executed locally**. This is the database portion of Stage 2, not completed authentication or financial services.

## Installation in Supabase

1. Open the intended Supabase project → **SQL Editor** → **New query**.
2. Copy the entire migration, including `begin;` and `commit;`.
3. Execute as the project database administrator (`postgres`). No credentials need to be inserted into the SQL.
4. Check that the query succeeds, then inspect the tables in **Table Editor**, schema `public`.

This is a **first-installation script**, to run once against a project without these application tables. It deliberately fails if names collide rather than silently accepting an incompatible schema. It does not drop existing tables. An error rolls back the entire migration. If application tables already exist, compare them and prepare an incremental migration instead.

The script creates a domain, twelve tables, indexes, constraints, triggers, functions in the non-exposed `private` schema, grants and RLS policies. It adds a trigger to `auth.users`. Do not run only selected fragments. SQL Editor runs with administrative privileges and bypasses RLS; seeing all rows there is expected, not proof of client authorization.

If switching to Supabase CLI migrations after manual installation, reconcile this migration's version with remote migration history before `db push`; SQL Editor does not register CLI migration history automatically. Never rerun an already applied initial migration.

## Tables and ownership

| Table                  | Purpose                                                              |
| ---------------------- | -------------------------------------------------------------------- |
| profiles               | One profile per auth.users ID; BRL and America/Sao_Paulo             |
| accounts               | Cash accounts and dated opening balances                             |
| categories             | Per-user income/expense categories, including defaults               |
| credit_cards           | Non-sensitive card metadata and explicit early-settlement capability |
| credit_card_invoices   | Card billing periods, closing dates and due dates                    |
| recurring_transactions | Income/expense templates with configurable intervals                 |
| transactions           | Non-installment income and expense occurrences                       |
| installment_plans      | Original installment purchase and declared historical payments       |
| installments           | Individual remaining credit obligations                              |
| invoice_payments       | Cash settlement of invoices, partial payments and reversals          |
| chat_messages          | Per-user conversations, request IDs and user/assistant messages      |
| financial_audit_log    | Trigger-written history of financial inserts/updates                 |

Profiles use the Auth UUID as primary key. All other tables have their own UUID plus mandatory user_id. Composite foreign keys bind references to the same owner; invoice references also match the card, and category references match income/expense kind. All user-data tables have RLS enabled.

## Grants and RLS

- anon: no table access.
- authenticated: SELECT/INSERT/UPDATE for owned financial records, constrained by auth.uid() in both USING and WITH CHECK. No DELETE or TRUNCATE privileges.
- Profiles are created by the Auth trigger; users can read their own profile and update only display_name.
- Chat: users can read their own history and append only role=user; no client editing/deleting or forged assistant messages. The future Edge Function may persist assistant output with its server credential after explicit authorization.
- Audit: user-scoped read only. A fixed-search-path security-definer trigger writes history. The service role has read-only grants on this table, not direct writing privileges.
- Other tables grant the trusted service role administrative DML. Service-role credentials remain backend-only; RLS bypass means Edge Functions must independently validate ownership.
- Private functions have empty search_path, qualified references and no direct execute grant for API roles. No security-definer financial RPC is exposed.

Financial writes retain audit snapshots including notes. This is private application data, not telemetry or console logging. Define retention/export policy before production. Account deletion through an administrative Auth flow cascades profile-owned rows, including audit history. Browser deletion is intentionally unavailable; financial cancellation/reversal uses statuses.

## Financial representation

money_cents is a BIGINT domain restricted to ±9,007,199,254,740,991. Individual amounts are positive; opening balances can be negative. Zero credit limits and zero discounts are valid. Aggregate arithmetic must remain NUMERIC/BIGINT until its safe JavaScript range is checked; limiting each row does not make an arbitrary sum safe.

Calendar values are DATE; event timestamps are TIMESTAMPTZ. Invoice reference_month is the first day of the **due month**. Explicit closing/due dates are stored instead of deriving historical dates from editable card settings. Date generation and cutoff conventions remain Stage 3 work.

Cash uses opening balances plus settled non-credit income minus settled non-credit expenses minus confirmed invoice payments. settled_on is the effective cash date. Pending income does not count as received. Reversed invoice payments do not count as outgoing cash; reversed_at preserves the reversal time for future as-of reporting.

For competence, combine non-cancelled expense transactions with active installments belonging to active plans. Do not also add plan totals, invoice totals or invoice payments. A credit transaction is posted or cancelled, never cash-settled in the transaction row. Credit settlement is derived from invoice payments. There is no editable invoice total or paid flag that could disagree with items.

Plans store original amount/count plus paid_before_tracking; only numbers after that historical count are allowed as installment rows. Original terms and installment identity/amount are immutable. Cent allocation uses integer division with one extra cent on the earliest remainder installments. The validation trigger checks each amount and installment number. The total must allow at least one cent per installment; maximum count is 600. Installments retain original competence when anticipated into another invoice; discounts require an anticipation date and an explicitly enabled card capability.

## Idempotency and recurrence

Transactions, plans, recurring templates and invoice payments have a per-user unique immutable idempotency_key. Services **must supply and reuse the same key on retries**; random defaults cannot identify retries. Duplicates raise a unique violation; returning the existing result and verifying payload equality belong to future services/RPCs.

Recurrence identity is (user_id, recurring_transaction_id, recurrence_on). recurrence_on is the original scheduled date, independent of edited due_date. It cannot change once created. Chat has (user_id, request_id, role) uniqueness. Multi-tool AI idempotency and request budgets are not implemented by these constraints.

## User initialization

New Auth users receive a profile and 14 per-user default categories: ten expense and four income categories. Existing auth.users are backfilled in the migration. No account balance, card, transaction or fake financial history is inserted. Display name defaults to empty and is not trusted for authorization.

## Explicit limits and next steps

- Auth UI and protected routes are implemented; the user confirmed real login on 2026-10-30. Database policy verification, generated database types and persistence services remain pending.
- Atomic creation of full installment schedules and recurrence generation are not implemented. Row checks do not prove a schedule is complete.
- No RPC yet enforces aggregate invoice balance, overpayment rejection, closed/cancelled invoice writes, account opening-date cutoffs, cancellation propagation or atomic early settlement. Do not enable those workflows until transactional operations and concurrency rules are implemented.
- Do not use direct client multi-row writes for workflows requiring all-or-nothing consistency. Invoice payments must not be mirrored as expense transactions by services.
- SQL regression cases are authored in supabase/tests/initial_schema.sql for future execution only. They have not been run. Build/test commands remain prohibited.

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Auth user profiles and triggers](https://supabase.com/docs/guides/auth/managing-user-data), [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html).
