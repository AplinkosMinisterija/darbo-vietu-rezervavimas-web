# stalu-rezervavimas-web

Aplinkos ministerijos darbo vietų rezervavimo frontend'as — React 18 + Vite +
TypeScript + styled-components.

Companion repo'ai:

- **stalu-rezervavimas-api** — Moleculer.js backend (`/api/*`)
- **biip-infra** — docker-compose + Caddy deploy

Spec'as: `../stalu-rezervavimas/docs/superpowers/specs/2026-05-28-stalu-rezervavimas-design.md`

## Local dev

```bash
yarn install
yarn dev
```

Vite startuoja ant `http://localhost:5173`. `/api/*` proxy'inasi į backend'ą
(`http://localhost:3000`) — paleisk `stalu-rezervavimas-api` lygiagrečiai:

```bash
cd ../stalu-rezervavimas-api
yarn dev    # Moleculer :3000
```

## Build

```bash
yarn build      # tsc -b && vite build → dist/
yarn preview    # serve dist/ ant :4173
```

## Scripts

| Komanda | Aprašymas |
|---|---|
| `yarn dev` | Vite dev server (:5173) + HMR + `/api` proxy |
| `yarn build` | Production build į `dist/` |
| `yarn preview` | Lokalus preview prod build'o |
| `yarn lint` | ESLint per `src/` |
| `yarn typecheck` | `tsc --noEmit` |
| `yarn test` | Vitest |
| `yarn format` | Prettier per `src/` |

## Routing skeleton

```
/login                       LoginPage           public
/                            HomePage            user (RequireAuth)
/admin/*                     AdminPlaceholderPage admin (RequireAdmin)
```

Aktualus puslapių sąrašas spec'o #7 skyriuje.

## Theme

`src/styles/theme.ts` — mint `#5FBD86` + navy `#29346F`, Poppins font.
Sek biip-alis-web pattern'ą.

## Deploy

Produkcijos image build'inamas iš `Dockerfile` (Node 20 builder → Nginx 1.27).
Nginx config'as turi SPA fallback'ą ir hashed asset cache'ą. Routing'as ir
proxy'inimas į `/api/*` daromas išorinio Caddy'io (`biip-infra`), ne šio
container'io.
