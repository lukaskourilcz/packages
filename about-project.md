# packages

A monorepo of small, dependency-free TypeScript packages extracted from OwnDashboard: Czech invoice and payment helpers, a bank statement CSV parser, Czech and EU tax-registry helpers, and the repository markdown contract (NEEDED.md, about-project.md) with its CLI. Published to GitHub Packages under `@lukaskourilcz`.

## Tech stack

- **TypeScript** — strict ESM sources and the published type declarations
- **Node.js** — the runtime (20 or newer) and npm workspaces for the monorepo
- **Vitest** — the test runner for every package
- **GitHub Actions** — CI on Node 20, 22 and 24, and tag-driven publishing
- **GitHub Packages** — the npm registry the packages are published to
