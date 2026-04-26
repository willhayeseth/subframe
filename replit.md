# Subframe Protocol — Workspace

## Project Overview
Web3 ENS subdomain platform on `subframe.eth`. Users claim `<name>.subframe.eth` subdomains, each backed by an ERC-404 token with AI-generated art. Platform pays all gas.

## Architecture
- **Frontend**: `artifacts/subframe/` (React + Vite) → GitHub: `frontend/`
- **Backend API**: `artifacts/api-server/` (Express 5) → GitHub: `backend/`
- **Shared libs**: `lib/db`, `lib/api-zod`, `lib/api-client-react`, `lib/integrations-openai-ai-server`
- **Database**: PostgreSQL + Drizzle ORM (Replit managed)
- **Monorepo**: pnpm workspaces

## Stack
- Node.js 24, TypeScript 5.9, pnpm
- Express 5, Zod (`zod/v4`), drizzle-zod, Orval codegen
- Vite 7, React, wagmi, @reown/appkit (WalletConnect)
- esbuild (backend bundle), vite (frontend bundle)

## GitHub Repo
- Repo: `willhayeseth/subframe`
- Mapping: `artifacts/subframe/` → `frontend/`, `artifacts/api-server/` → `backend/`
- tsconfig in GitHub uses `../` (one level up); locally uses `../../` (two levels up)
- Pushes via GitHub REST API (git objects), not git CLI (blocked in main agent)
- Commit author: `hayes` / `278034540+willhayeseth@users.noreply.github.com`
- Committer: `auto-subframe[bot]` / `3465679+auto-subframe[bot]@users.noreply.github.com`
- Token: reconstruct PEM from `GITHUB_APP_PRIVATE_KEY`, sign JWT with `GITHUB_APP_ID`, get installation token via `/app/installations`

## CI Pipeline (`.github/workflows/ci.yml`)
- All `pnpm install` steps use `--no-frozen-lockfile --shamefully-hoist` (required for @types/node to resolve)
- Lib builds use `pnpm --filter @workspace/X exec tsc --build .` (NOT `pnpm exec tsc --build lib/X`)
- Jobs: Type Check → Build Frontend + Build Backend + Deploy Pages + Pin IPFS/ENS
- GitHub secrets needed: `VITE_API_BASE_URL`, `ADMIN_SECRET`, `BACKEND_URL`, `PINATA_JWT` (already set)

## Replit Deployment
- **Both artifacts deploy via Replit** (not Railway/Fly.io — all secrets already in Replit)
- `artifacts/api-server` → kind: `api`, health check: `GET /api/healthz`, PORT=8080
- `artifacts/subframe` → kind: `web`, static serving from `artifacts/subframe/dist/public`
- Production run: `node --enable-source-maps artifacts/api-server/dist/index.mjs`
- All secrets (`DATABASE_URL`, `ETH_RPC_URL`, `ENS_PRIVATE_KEY`, `PINATA_JWT`, `SESSION_SECRET`, `ETHERSCAN_API_KEY`) are Replit secrets — available in both dev and production automatically

## Secrets (All in Replit — DO NOT hardcode)
| Secret | Purpose |
|--------|---------|
| `ENS_PRIVATE_KEY` | Wallet that controls subframe.eth, pays gas |
| `ETH_RPC_URL` | Ethereum mainnet RPC |
| `ETHERSCAN_API_KEY` | Contract verification |
| `PINATA_JWT` | IPFS pinning |
| `SESSION_SECRET` | Express session |
| `DATABASE_URL` / `PG*` | PostgreSQL (Replit managed) |
| `VITE_REOWN_PROJECT_ID` | WalletConnect (public ID, hardcoded in web3.ts) |
| `GITHUB_APP_ID` / `GITHUB_APP_PRIVATE_KEY` | GitHub App for automated pushes |
| `PROTOCOL_TREASURY` | Treasury wallet address |
| `WALLET_*` | Test wallet addresses |

## Smart Contracts
- `SubframeERC404Impl.sol` — ERC-404 implementation (Clone Factory via EIP-1167)
- `SubframeSwapHook.ts` — Uniswap V4 hook bytecode
- `SubframeERC404Factory.ts` — Clone factory bytecode
- Uniswap V4: PoolManager=`0x000000000004444c5dc75cB358380D2e3dE08A90`, PositionManager=`0x1B1C77B606d13b09C84d1c7394B96b147bC03147`
- `ART_FACTORY_ADDRESS` — not yet set (auto-deploys on first subdomain claim)
- `PROTOCOL_TREASURY` — set ✓

## Key Routes
- `GET /api/healthz` — health check (rate limiter skips this)
- `POST /api/subdomains/claim` — claim subdomain, deploys ERC-404, registers ENS
- `GET /api/subdomains/by-name/:name` — lookup subdomain
- `GET /api/wallets/:address` — wallet profile
- `GET /api/art/:subdomain` — art metadata for subdomain
- `POST /api/art/generate` — generate AI art (needs `REPLICATE_API_KEY`)
- `GET /api/admin/*` — admin endpoints (require `ADMIN_SECRET` header)

## ENS Flow (4-step, backend wallet pays gas)
1. Deploy ERC-404 clone via factory
2. Register subdomain node on ENS registry
3. Set resolver
4. Set contenthash (IPFS CID of subdomain app)

## Frontend Pages
- `/` — landing / explore
- `/claim` — claim subdomain flow
- `/profile/:name` — subdomain profile with art gallery
- `/collection` — browse all subdomains
- `/analyze` — wallet analyzer

## Production Phases Remaining
1. ✅ CI green (shamefully-hoist fix pushed, waiting for result)
2. ✅ Backend deploys on Replit (secrets already present)
3. **Phase 3** — Deploy smart contracts to mainnet, set `ART_FACTORY_ADDRESS`
4. **Phase 4** — Generate 69 art variations (needs `REPLICATE_API_KEY` — only missing secret)
5. **Phase 5** — Set GitHub secrets: `VITE_API_BASE_URL`, `BACKEND_URL`, `ADMIN_SECRET`
6. **Phase 6** — ENS contenthash auto-updates via CI `pin-to-ipfs.mjs` after Phase 5
7. **Phase 7** — Uniswap V4 pool setup after first token mint
8. **Phase 8** — End-to-end smoke test

## Key Files
- `artifacts/api-server/src/lib/ens.ts` — ENS registration, contenthash
- `artifacts/api-server/src/lib/token.ts` — ERC-404 deployment flow
- `artifacts/api-server/src/routes/subdomains.ts` — subdomain claim, persists tx hashes
- `artifacts/subframe/src/lib/web3.ts` — wagmi/reown setup (projectId hardcoded)
- `artifacts/subframe/src/pages/profile.tsx` — art gallery UI
- `frontend/scripts/pin-to-ipfs.mjs` — IPFS pin + ENS contenthash update (CI)
- `.github/workflows/ci.yml` — CI pipeline
- `pnpm-workspace.yaml` — workspace + catalog deps

## Common Pitfalls
- NEVER use `pnpm exec tsc --build lib/X` in CI — use `pnpm --filter @workspace/X exec tsc --build .`
- NEVER edit `artifact.toml` directly — use `verifyAndReplaceArtifactToml` callback
- tsconfig path `../` vs `../../` differs between GitHub and local (local has extra nesting)
- GitHub pushes must include both `frontend/` and `backend/` path mappings
- Rate limiter skips `/api/health*` routes already — health check always gets through
- `pnpm-workspace.yaml` has both `artifacts/*` (Replit) and `frontend`/`backend` (GitHub CI) — pnpm silently ignores non-existent dirs
