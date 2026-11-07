# Contributing

Thanks for taking a look. Issues and pull requests are welcome, from a typo to a new bank's CSV layout.

## Set up

```sh
git clone https://github.com/lukaskourilcz/packages.git
cd packages
npm install
npm run check   # type-check, test and build every package
```

Node 20 or newer. The only dev tools are TypeScript and Vitest.

## Layout

```text
packages/
  czech-payments/       src/, test/, README.md, package.json
  czech-bank-csv/
  czech-tax-registry/
  repo-contract/
```

Each package is plain ESM TypeScript with no runtime dependencies. Tests live next to the package in `test/` and run with `npm test` from the root (or `npx vitest run packages/<name>`).

## Pull requests

- Keep a change small and focused: one fix or one feature per pull request.
- Add or update a test for every behaviour change. A bug fix starts with a failing test.
- Keep packages dependency-free. If a change needs a dependency, open an issue first.
- Update the package README when the public API changes.
- Commit messages follow `type(package): what changed`, for example `fix(czech-bank-csv): read the ČSOB date column`.

**A new bank layout?** Add an anonymised header row and two or three sample rows to `packages/czech-bank-csv/test/bank-csv.test.ts`. Never paste real account numbers, names or amounts.

## Releasing

Maintainers bump `version` in the package's `package.json`, merge, then push a tag named `<package>-v<version>` (for example `czech-payments-v0.2.0`). The Publish workflow checks that the tag matches the version, runs every check and publishes to GitHub Packages.

## Conduct

Be kind and assume good intent. Harassment or personal attacks are not welcome in issues, pull requests or discussions.
