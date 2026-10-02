# Mr. Accounting

A single-user accounting app: record debit and credit transactions, see the balance, and view the last 5 transactions. A transaction that would make the balance negative is rejected.

npm workspaces monorepo:

- `packages/api`: Express + tRPC + Zod, data stored in JSON files
- `packages/client`: Vite + React + Pico CSS

## Run it

Requires Node.js 24 (what the project is developed on) and ports 3000 and 3001 free.

```sh
npm install
npm run dev
```

Open <http://localhost:3000> and log in with `testuser` / `Ch4Nip!RLNg`.

## Build and run the build

```sh
npm run build   # type checks, then builds both packages
npm start       # API on :3001, client on :3000
```

Open <http://localhost:3000> as before. The API build is `packages/api/dist/index.js` (run with Node) and the client build is `packages/client/dist` (served by `vite preview`).

- The client bakes in `VITE_API_URL` at build time. To use another API address, rebuild: `VITE_API_URL=http://localhost:4001 npm run build`, then start the API with `PORT=4001`.
- The built client page includes a Content Security Policy that only allows requests to that API address.
- Sessions are lost on restart unless `JWT_SECRET` is set.
- `NODE_ENV=production` makes the session cookie `Secure`, so serve the API over HTTPS (`TLS_KEY_PATH`, `TLS_CERT_PATH`) when you set it.

## Scripts

| Command                           | What it does                                |
| --------------------------------- | ------------------------------------------- |
| `npm run dev`                     | API (watch mode) and client together        |
| `npm test`                        | Unit tests for both packages (Vitest)       |
| `npm run lint` / `lint:check`     | ESLint, with / without autofix              |
| `npm run format` / `format:check` | Prettier, write / check                     |
| `npm run typecheck`               | TypeScript for both packages                |
| `npm run seed:auth -w api`        | Reset `auth.json` to the `testuser` account |
| `npm run analyze -w client`       | Bundle size report                          |

A Husky pre-commit hook runs format check, lint, typecheck and tests.

## Configuration

All optional. API environment variables:

| Variable                        | Default                 | Notes                                          |
| ------------------------------- | ----------------------- | ---------------------------------------------- |
| `PORT`                          | `3001`                  |                                                |
| `CLIENT_ORIGIN`                 | `http://localhost:3000` | Allowed CORS origin                            |
| `DATA_DIR`                      | `packages/api/data`     | Holds `auth.json` and `transactions.json`      |
| `JWT_SECRET`                    | random per start        | Set it to keep sessions across restarts        |
| `TLS_KEY_PATH`, `TLS_CERT_PATH` | unset                   | Serve the API over HTTPS when both are set     |
| `NODE_ENV`                      | unset                   | `production` makes the session cookie `Secure` |

Client: `VITE_API_URL` (default `http://localhost:3001`), read at build time.

## How it works

- **API:** tRPC under `/trpc`. Login sets an HttpOnly cookie holding a JWT; mutations also need the CSRF token (`x-csrf-token` header) returned at login. Users and their scopes live in `auth.json`.
- **Transactions:** the Ledger module enforces the balance rule, and `transactions.json` is written atomically. `transactions.account` returns the balance and recent transactions in one call.
- **Date rule:** a transaction can't be dated in the future (5 minutes of clock skew allowed) or more than a year back.
- **Domain terms:** see [CONTEXT.md](CONTEXT.md). Original requirements are in [docs/](docs).
