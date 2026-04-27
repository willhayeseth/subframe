# Subframe Protocol

Claim your ENS subdomain on `subframe.eth` with one transaction and zero gas for registration. Built on Ethereum Name Service, IPFS, and AI-powered wallet analysis.

[![License: MIT](https://img.shields.io/badge/License-MIT-cbff4d.svg)](./LICENSE)
[![X](https://img.shields.io/badge/X-%40subframeeth-black)](https://x.com/subframeeth)

**[Website](https://subframe.network)** | **[Docs](https://subframe.network/docs)** | **[Explore](https://subframe.network/explore)**

---

## What It Does

Subframe Protocol gives every Ethereum wallet a permanent, decentralized identity at `name.subframe.eth`. Registration runs entirely on-chain with the backend covering all gas costs. The user signs exactly one transaction to activate their primary ENS name.

- **Zero gas for users** during registration. The backend wallet handles subdomain creation, resolver setup, address record, and IPFS contenthash.
- **One user-signed transaction** (`setName`) to activate the ENS primary name so the address resolves on Etherscan and across the ecosystem.
- **Decentralized profile** hosted on IPFS, served through ENS contenthash at `name.subframe.eth.limo` and also at `subframe.network/name`.
- **AI wallet analysis** powered by OpenAI, summarizing on-chain activity, risk level, and behavioral tags.
- **Art Protocol** for generating and trading a limited 69-piece ERC-404 art collection per wallet, tradeable on Uniswap V4.
- **Live registry** committed to this repo automatically on every successful registration.

---

## Architecture

```
Browser (subframe.network / subframe.eth.limo)
  |
  +-- React + Vite SPA (IPFS + ENS contenthash)
        |
        +-- /api  Express API Server
              |
              +-- ENS Registration    (viem, subframe.eth backend wallet)
              +-- IPFS Upload         (Pinata)
              +-- Wallet Data         (Etherscan API)
              +-- AI Analysis         (OpenAI GPT-4o)
              +-- Art Protocol        (ERC-404 + Uniswap V4 hook)
              +-- Registry Sync       (GitHub App API)
              +-- Database            (PostgreSQL + Drizzle ORM)
```

### Registration Flow

```
User connects wallet
        |
        v
POST /api/subdomains   (backend processes all 4 on-chain steps)
        |
        +-- [Step 1] Create subdomain node in ENS Registry
        +-- [Step 2] Set public resolver on the node
        +-- [Step 3] Set addr(60) record to user wallet address
        +-- [Step 4] Transfer node ownership to user wallet
        |
        v
User signs one TX: setName(name.subframe.eth)
        |
        v
Primary ENS name active
Profile live at name.subframe.eth.limo and subframe.network/name
        |
        v
registry.json committed to GitHub automatically
```

---

## Art Protocol

Each registered wallet can generate a collection of 69 unique AI-generated artworks stored as ERC-404 tokens. ERC-404 combines ERC-20 and ERC-721 in a single contract, making each piece both a tradeable fungible token and a unique NFT. Trading is powered by a custom Uniswap V4 hook deployed on mainnet.

- 69 pieces per wallet, generated on-chain
- Buy and sell directly from any profile page
- No current platform fee; a creator fee on trades is planned

---

## Project Structure

```
subframe/
  frontend/              React + Vite web app
    src/
      pages/             home, claim, onboarding, profile, explore, analyze,
                         ai-chat, art-protocol, art-trading, docs
      components/        layout, UI primitives (shadcn/ui), 3D scene
      lib/               wagmi/reown web3 config, utils
  backend/               Express API server
    src/
      routes/            subdomains, wallets, openai, upload, health, admin
      lib/               ens, ipfs, github, rateLimit, logger
  packages/
    api-spec/            OpenAPI 3.0 specification (source of truth)
    api-client-react/    Generated React Query hooks (from api-spec via Orval)
    api-zod/             Generated Zod validators (from api-spec via Orval)
    db/                  Drizzle ORM schema (subdomains, conversations, messages)
  scripts/               IPFS deploy and ENS contenthash automation
  .github/workflows/     CI config
  registry.json          Live registry of all linked subframe.eth subdomains
```

---

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10+
- PostgreSQL database

### Environment Variables

Create a `.env` file in the `backend/` directory:

```env
ETH_RPC_URL=https://mainnet.infura.io/v3/your-key
ENS_PRIVATE_KEY=your-backend-wallet-private-key
ETHERSCAN_API_KEY=your-etherscan-api-key
OPENAI_API_KEY=your-openai-api-key
PINATA_JWT=your-pinata-jwt
DATABASE_URL=your-postgres-connection-string
SESSION_SECRET=random-secret-string
ADMIN_SECRET=admin-api-secret
VITE_REOWN_PROJECT_ID=your-reown-project-id
```

### Install and Run

```bash
# Install all workspace dependencies
pnpm install

# Start backend API server
pnpm dev:backend

# Start frontend dev server
pnpm dev:frontend
```

### Code Generation

The API client and Zod schemas are generated from the OpenAPI spec. After modifying `packages/api-spec/openapi.yaml`:

```bash
pnpm --filter @workspace/api-spec run generate
```

### Database

```bash
# Push schema changes to the database
pnpm --filter @workspace/db run db:push
```

---

## Deployment

### Frontend (IPFS + ENS)

```bash
bash scripts/deploy-to-ipfs.sh
```

This script:
1. Builds the React app with `NODE_ENV=production`
2. Uploads the build output to Pinata (IPFS)
3. Sets the contenthash on `subframe.eth` via ENS public resolver

The app is accessible at `subframe.eth.limo` within a few minutes of ENS propagation, and always at `subframe.network`.

### Backend

The API server runs as an always-on service at `subframe.network/api`.

---

## Contributing

Contributions are welcome. Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes and ensure types pass: `pnpm -r run typecheck`
4. Open a pull request against `main` with a clear description

### Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org):

```
feat(scope): add something new
fix(scope): correct a bug
chore(scope): update tooling or config
docs(scope): update documentation
refactor(scope): restructure without behavior change
```

Scopes: `frontend`, `backend`, `packages`, `scripts`, `registry`, `ci`

### Code Style

- TypeScript strict mode enabled across all packages
- No `any` without explicit justification

---

## Registry

Every successfully registered subdomain is recorded in [`registry.json`](./registry.json) via an automated commit from the backend. The file is the canonical public list of all `subframe.eth` subdomains.

---

## Links

- Website: [subframe.network](https://subframe.network)
- Docs: [subframe.network/docs](https://subframe.network/docs)
- Explore: [subframe.network/explore](https://subframe.network/explore)
- X: [@subframeeth](https://x.com/subframeeth)
- GitHub: [willhayeseth/subframe](https://github.com/willhayeseth/subframe)

---

## License

[MIT](./LICENSE) Copyright 2026 Will Hayes
