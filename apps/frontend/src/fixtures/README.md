# Fixture harness — DEV ONLY

Renders the real route tree with **fake auth and canned API data** so pages that
sit behind sign-in can be looked at and screenshotted without Clerk, a backend,
a database, a queue, or any LLM call.

It proves layout and state handling. It does **not** prove the product works
end to end. See `docs/verification/v1-frontend/README.md`.

## Run

```bash
npm run fixtures -w @fricta/frontend
```

Then open `http://127.0.0.1:3100/app` (any app route works).

```bash
npm run fixtures:screenshots -w @fricta/frontend
```

Set `CHROMIUM_PATH` if Playwright's bundled browser isn't installed.

## Scenarios

Append to any URL; the choice sticks for the tab (sessionStorage).

| Query            | Effect                                                    |
| ---------------- | --------------------------------------------------------- |
| `?fx=populated`  | Sample data everywhere (default)                          |
| `?fx=empty`      | Brand-new account: every list is empty                    |
| `?fx=loading`    | Requests never resolve — skeletons stay on screen         |
| `?fx=error`      | Every request fails with a database-flavoured 500         |
| `?fx=offline`    | Every request fails at the network layer                  |
| `?fxAuth=loading`| The auth widget / session check never finishes loading    |

## How it stays out of production

- `fixtures.html` is not an input of `vite build`, which only bundles `index.html`.
- Nothing under `src/` imports `src/fixtures/`.
- `main.tsx` here throws unless `import.meta.env.DEV`.
- `vite.fixtures.config.ts` refuses any command other than `serve`.
- `@clerk/clerk-react` is aliased to `mockClerk.tsx` only in that config; the
  production config is untouched and the real Clerk SDK is never loaded here.

## Files

| File            | Purpose                                                        |
| --------------- | -------------------------------------------------------------- |
| `main.tsx`      | Harness entry: fonts, mock API, fixture badge, real `<App />`   |
| `mockClerk.tsx` | Stand-in for the Clerk SDK (always "signed in" as a fake user)  |
| `mockApi.ts`    | Replaces `fetch` for `/api/*`; inert `EventSource`              |
| `data.ts`       | Hand-written sample payloads shaped like the backend's          |
| `scenario.ts`   | Reads `?fx=` / `?fxAuth=`                                       |

The Clerk sign-in/sign-up cards shown in the harness are labelled placeholders,
not Clerk's markup. Fixture payload shapes were written from the backend route
handlers and Prisma schema by hand; they can drift from the real API.
