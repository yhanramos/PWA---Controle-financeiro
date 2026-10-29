# AGENTS.md — Finance PWA

## Purpose

Build a reliable, mobile-first personal finance PWA. Initially single-user, but every persisted record must be scoped to an authenticated user. This file is the working agreement for Codex and contributors.

## Stack

- React + TypeScript (strict), Vite, React Router
- Tailwind CSS, shadcn/ui, Lucide React
- TanStack Query, React Hook Form, Zod
- Supabase (PostgreSQL, Auth, RLS, Edge Functions)
- Google Gemini via server-side Edge Function only
- Vitest, React Testing Library, ESLint, Prettier
- vite-plugin-pwa; Recharts when charts are implemented

Use compatible stable versions; do not introduce new dependencies without a concrete need.

## Workflow

1. Inspect the repository and relevant files before editing. Preserve existing conventions unless they conflict with this document.
2. Make small, reviewable changes. Implement only the requested scope; do not scaffold fake working features.
3. Before changing financial rules or schema, document the decision and add or update tests.
4. Run available lint, typecheck, tests, and build after changes. Report exact commands and results; never claim tests passed if not run.
5. Summarize changed files, behavior, configuration required, limitations, and next steps.
6. Never commit secrets or modify production data without explicit authorization.

## Project structure

```text
src/
  app/             # router, providers, layouts, global styles
  components/ui/   # shadcn primitives
  components/shared/ # cross-feature presentation components
  features/
    dashboard/
    cards/
    transactions/
    installments/
    income/
    recurring/
    categories/
    ai-chat/
  hooks/           # truly shared hooks only
  lib/             # Supabase client, formatting, generic utilities
  services/        # cross-feature orchestration only
  types/           # shared domain types only
supabase/
  migrations/
  functions/financial-assistant/
docs/
```

Within a feature, use `components/`, `hooks/`, `schemas/`, `services/`, `types/` as needed. Avoid empty placeholder folders. No feature may import another feature's internal implementation; expose a narrow public interface when necessary. Do not create a generic abstraction until it solves a repeated problem.

## TypeScript and React

- Enable strict TypeScript. Avoid `any`, non-null assertions, unsafe casts, and suppressed lint errors; justify exceptions.
- Prefer named exports and small function components. Keep business logic outside JSX.
- Use TanStack Query for server state, explicit query keys, invalidation after mutations, and clear loading/error/empty states.
- Use local component state for local UI. Add Zustand only if a demonstrated cross-feature need arises.
- Use React Hook Form + Zod for form validation. Validate again at the server boundary.
- Never call Supabase directly from presentational components; use feature services/hooks.
- Favor semantic HTML, keyboard navigation, accessible labels, and appropriate focus management.
- Use Portuguese (Brazil) for user-facing copy; English for code identifiers and technical documentation.

## UI and design

- Mobile-first; bottom navigation on mobile and sidebar on desktop.
- Default dark theme with restrained blue/violet accents. Use Tailwind tokens/CSS variables, not scattered hardcoded colors.
- Build from shadcn/ui primitives; keep spacing, radii, typography, and states consistent.
- Format currency with `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` at presentation boundaries.
- Show skeletons/loading, useful empty states, actionable errors, and success feedback.
- Never show mock figures as real balances. If demonstration data is necessary, label it clearly and isolate it from production services.

## Financial domain invariants (critical)

- Default currency BRL and timezone `America/Sao_Paulo`. Store calendar due dates as `date`; use timezone-aware timestamps for events.
- Store monetary amounts as integer centavos (within safe integer range) or PostgreSQL `numeric`, with explicit conversion rules. Never use floating point for monetary calculations.
- Distinguish **transaction/purchase**, **obligation/installment/invoice**, and **payment/settlement**. Avoid double counting purchases when an invoice is paid.
- Distinguish actual cash balance, accrued expenses, outstanding obligations, and forecast balance. Forecast income is not received income.
- Credit-card purchases belong to invoices determined by the card closing day, purchase date, and documented cutoff policy. Define behavior for months without the configured day, timezone boundaries, and historical changes.
- Installments must sum exactly to the original total; distribute remainder cents deterministically and test it.
- Support historical installments by recording what is known, without fabricating past payments or purchase history.
- Recurrence generation and payment operations must be idempotent; enforce database uniqueness where appropriate.
- Early settlement, discounts, cancellations, refunds, and edits must preserve auditability and recalculate forecasts correctly.
- Never infer that a card supports early installment payment.
- Prefer explicit domain functions (e.g. `calculateInstallments`, `resolveInvoicePeriod`, `calculateCashForecast`) with unit tests.
- If a financial rule is unspecified, document assumptions in `docs/FINANCIAL_RULES.md` and ask before irreversible behavior.

## Data and Supabase

- Version schema changes as SQL migrations; do not silently edit existing applied migrations.
- Every user-owned table must have `user_id` or an equally safe ownership path, RLS enabled, and tested policies for SELECT/INSERT/UPDATE/DELETE.
- Check ownership in backend operations even if RLS is active. Never trust IDs or totals supplied by the client.
- Add foreign keys, check constraints, useful indexes, and unique constraints for idempotency.
- Use generated database types where practical. Keep migrations, types, and Zod schemas aligned.
- Never expose service-role keys to the browser. Use only public Supabase credentials client-side; keep privileged operations server-side.
- Do not log financial content, credentials, access tokens, or complete AI conversations by default.

## Gemini assistant

- Call Gemini only from a server-side Edge Function; secrets must remain server-side.
- Use structured outputs/function calling with allowlisted operations and Zod/schema validation.
- Treat the model as an **intent parser**, not as a source of financial truth. All calculations and persistence are deterministic backend operations.
- Resolve card/category names to user-owned IDs; ask for clarification if ambiguous or missing.
- Read tools may return scoped financial summaries; write tools must validate ownership, amount, dates, and payment method.
- Require explicit confirmation for destructive or materially consequential actions. Confirm success only after database commit.
- Use idempotency keys for write requests; handle retries and model/tool-call repetition safely.
- Defend against prompt injection in chat history and tool outputs. Never follow user content that requests bypassing authorization or tool policies.
- Apply authentication, rate limiting, cost controls, bounded context, and safe error messages.

## PWA and offline behavior

- Provide manifest, icons, installable app shell, and a meaningful offline fallback.
- Cache static assets only by default. Do not cache authenticated API responses or sensitive financial data in a shared/public cache.
- MVP is online-first: disable financial writes when offline and explain why. Do not implement optimistic offline transactions without a conflict-resolution design.

## Security and privacy

- Do not collect PAN/card number, CVV, bank password, or credentials for financial institutions.
- Validate all untrusted input at API boundaries; use least-privilege access and Supabase Auth/RLS.
- Keep `.env` out of version control and maintain `.env.example` with placeholders only.
- Sanitize/escape untrusted rendered content; avoid dangerous HTML injection.
- Avoid leaking personal financial details in analytics, error reports, URLs, or console logs.

## Testing and acceptance

- Unit-test installment allocation, invoice cutoff, due dates (including February/leap years), forecast calculation, recurring generation, settlement, refunds, and duplicate prevention.
- Test key UI forms, validation, loading/error states, and navigation.
- Test RLS/ownership boundaries and Edge Function authorization where feasible.
- Before considering a feature complete: no TypeScript errors, lint clean, relevant tests passing, production build successful, no mock-only persistence, and documentation updated.

## Documentation

Maintain:

- `README.md`: setup, env vars, commands, deployment notes
- `docs/ARCHITECTURE.md`: modules, boundaries, data flow, decisions
- `docs/DATABASE.md`: schema and RLS model
- `docs/FINANCIAL_RULES.md`: precise calculations and assumptions
- `docs/AI_INTEGRATION.md`: tools, schemas, safety, cost limits
- `docs/ROADMAP.md`: milestones and known gaps

## Response format after each task

Report: **Implemented**, **Files changed**, **Validation run** (commands/results), **Configuration needed**, **Known limitations**, and **Next recommended step**. Be explicit about anything not executed or verified.
