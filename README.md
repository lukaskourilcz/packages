# packages

[![CI](https://github.com/lukaskourilcz/packages/actions/workflows/ci.yml/badge.svg)](https://github.com/lukaskourilcz/packages/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-2D7A2D.svg)](LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6.svg)
![Runtime dependencies](https://img.shields.io/badge/runtime%20dependencies-0-2D7A2D.svg)
![Node](https://img.shields.io/badge/node-%E2%89%A520-339933.svg)

Small, dependency-free TypeScript packages taken out of apps that run them in production. Most of them solve something every Czech web app eventually rebuilds by hand: the QR Platba payload, an IBAN from `19-2000145399/0800`, a bank CSV with `1 234,56` amounts, an IČO checksum, an ARES lookup. Plus one tool for keeping repositories readable for people and coding agents alike.

| Package | Version | What it does |
| --- | --- | --- |
| [`@lukaskourilcz/czech-payments`](packages/czech-payments) | ![version](https://img.shields.io/github/package-json/v/lukaskourilcz/packages?filename=packages%2Fczech-payments%2Fpackage.json&label=) | Invoice VAT math, IBAN from a Czech account number, the QR Platba (SPAYD) string, payment-to-invoice matching by variable symbol |
| [`@lukaskourilcz/czech-bank-csv`](packages/czech-bank-csv) | ![version](https://img.shields.io/github/package-json/v/lukaskourilcz/packages?filename=packages%2Fczech-bank-csv%2Fpackage.json&label=) | Bank statement CSV to clean rows: sniffed delimiter, accent-insensitive headers, Czech numbers and dates |
| [`@lukaskourilcz/czech-tax-registry`](packages/czech-tax-registry) | ![version](https://img.shields.io/github/package-json/v/lukaskourilcz/packages?filename=packages%2Fczech-tax-registry%2Fpackage.json&label=) | IČO checksum, EU VAT ids, typed ARES and VIES lookups that keep an outage apart from an invalid number |
| [`@lukaskourilcz/repo-contract`](packages/repo-contract) | ![version](https://img.shields.io/github/package-json/v/lukaskourilcz/packages?filename=packages%2Frepo-contract%2Fpackage.json&label=) | Parse and lint `NEEDED.md` action items and the `about-project.md` stack; library and CLI |

Every package is ESM with types, has no runtime dependencies, runs in Node 20+ and (apart from the two network helpers) in the browser, and is tested on Node 20, 22 and 24.

## Install

The packages are published to GitHub Packages. Point the scope at it once per project:

```sh
echo "@lukaskourilcz:registry=https://npm.pkg.github.com" >> .npmrc
npm install @lukaskourilcz/czech-payments
```

GitHub Packages asks for a token with `read:packages` even for public packages; `npm login --registry=https://npm.pkg.github.com` sets it up.

## A taste of each

**QR Platba for an invoice**

```ts
import { buildSpayd, czAccountToIban } from '@lukaskourilcz/czech-payments';

buildSpayd({ iban: czAccountToIban('19-2000145399/0800')!, amount: 1500.5, variableSymbol: '2026001' });
// "SPD*1.0*ACC:CZ6508000000192000145399*AM:1500.50*CC:CZK*X-VS:2026001"
```

**Import a bank statement and pair it with invoices**

```ts
import { parseBankCsv } from '@lukaskourilcz/czech-bank-csv';
import { matchPayments } from '@lukaskourilcz/czech-payments';

const { rows } = parseBankCsv(csvFromInternetBanking);
const { matched, unmatched } = matchPayments({ invoices, totals, transactions: rows.map((r, i) => ({ id: String(i), ...r })) });
// unmatched[n].reason: 'no-variable-symbol' | 'no-open-invoice' | 'amount-mismatch' | 'duplicate-payment' | …
```

**Fill a customer form from ARES and check the VAT id**

```ts
import { checkVies, lookupAres } from '@lukaskourilcz/czech-tax-registry';

const ares = await lookupAres('27074358');     // checksum first, then ARES
const vies = await checkVies('CZ27074358');    // 'valid' | 'invalid' | 'unavailable'
```

**Keep a repository's to-do list honest**

```sh
npx repo-contract lint
# NEEDED.md:12  error  missing-owner  Add [owner:me|ai].
```

## Why these

They come from [OwnDashboard](https://github.com/lukaskourilcz/own-dashboard), a personal operating system that issues invoices, imports bank statements, reconciles payments and tracks a dozen repositories. The code had tests and no framework ties, so it moved here instead of being rewritten in the next project. Each package keeps those tests and adds its own.

## Contributing

Bug reports, new bank CSV layouts and fixes are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md); `npm run check` runs everything CI runs.

## License

[MIT](LICENSE) © Lukáš Kouřil
