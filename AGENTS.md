# AGENTS.md

TypeScript npm-workspaces monorepo: `packages/api` (Express, tRPC, Zod, JSON-file storage) and `packages/client` (Vite, React, Pico CSS). Run and configuration details are in [README.md](README.md). Domain vocabulary is in [CONTEXT.md](CONTEXT.md); use those terms (Transaction, Balance, Ledger, Account snapshot, Session).

## Before finishing

Run from the repo root; the pre-commit hook runs the same four:

```sh
npm run format:check && npm run lint:check && npm run typecheck && npm test
```

Use `npm run format` and `npm run lint` to fix. Never use `console.*` (ESLint forbids it); use `packages/api/src/logger.ts`.

## Layout

- `api/src/ledger/`: Ledger module (rules) with storage adapters (`jsonFileAdapter`, `memoryAdapter`). Use the in-memory adapter in tests.
- `api/src/trpc.ts`, `routers/`: context, auth and scope middleware, procedures. Routers stay thin and map Ledger results to `ApiError`.
- `api/src/schemas/`: Zod schemas shared with the client through `api/schemas`.
- `api/src/constants.ts`: error codes and reasons shared with the client through `api/constants`.
- `api/src/services/authService.ts`, `storage/jsonFile.ts`: password hashing, JWT, atomic JSON file read/write.
- `client/src/session/`: Session module (status and CSRF token). The tRPC link in `api/trpcClient.ts` ends the Session on any `UNAUTHORIZED` except from `auth.login`.
- `client/src/content/`: all user-facing text; add strings to `content.en-US.json`, never inline them in components.
- `client/src/constants.ts`: shared client constants (session statuses, header name, formatters).

## Conventions

- Use `type` aliases, not `interface`. Camel case for data objects.
- Put repeated string identifiers in constants rather than literals.
- Comment only the non-obvious why.
- Validation lives in the Zod schemas and applies on both sides; the client maps issues to localized text in `validationMessages.ts`. Date rules apply to new input only, not stored data.
- UI follows Pico CSS: use its elements and classes, and add custom CSS in `client/src/index.css` only when needed. Keep markup semantic and accessible.
- Add or update tests with every behaviour change. API tests use temp data directories (`test/tempDataDir.ts`) or the in-memory Ledger adapter; client tests use Testing Library and stub `fetch` or mock `trpc`. Don't hard-code dates that will age out; use relative dates or fake timers.
- Keep the project simple: no features beyond the requirements in `docs/` unless asked.
