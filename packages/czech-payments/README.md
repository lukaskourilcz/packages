# @lukaskourilcz/czech-payments

Czech invoicing and payment helpers with no dependencies:

- **Invoice math**: line totals, the VAT recap (rekapitulace DPH) grouped by rate, and an optional rounding of a CZK total to whole crowns, reported as its own line.
- **IBAN**: validate any IBAN (mod 97) and turn a Czech account number such as `19-2000145399/0800` into `CZ6508000000192000145399`.
- **QR Platba**: build the SPAYD 1.0 string behind the Czech payment QR code.
- **Payment matching**: pair incoming bank payments with open invoices by variable symbol and amount, and explain every payment it could not pair.

It runs in Node and in the browser, and it never touches the network.

## Install

The package is published to GitHub Packages:

```sh
echo "@lukaskourilcz:registry=https://npm.pkg.github.com" >> .npmrc
npm install @lukaskourilcz/czech-payments
```

## QR Platba

```ts
import { buildSpayd, czAccountToIban } from '@lukaskourilcz/czech-payments';

const spayd = buildSpayd({
  iban: czAccountToIban('19-2000145399/0800')!,
  amount: 1500.5,
  variableSymbol: '2026001',
  dueDate: '2026-06-29',
  message: 'Faktura 2026001',
});
// "SPD*1.0*ACC:CZ6508000000192000145399*AM:1500.50*CC:CZK*X-VS:2026001*DT:20260629*MSG:Faktura 2026001"
```

Render the string with any QR library and a Czech banking app fills the transfer in when it scans it.

## Invoice totals

```ts
import { computeTotals } from '@lukaskourilcz/czech-payments';

const totals = computeTotals(
  [
    { quantity: 10, unit_price: 1200, vat_rate: 21 },
    { quantity: 1, unit_price: 99.9, vat_rate: 12 },
  ],
  { roundTotal: true, currency: 'CZK' },
);
// totals.subtotal, totals.vatTotal, totals.total (whole crowns),
// totals.rounding (the "Zaokrouhlení" line), totals.breakdown (one row per VAT rate)
```

## Matching payments to invoices

```ts
import { computeTotals, matchPayments } from '@lukaskourilcz/czech-payments';

const result = matchPayments({
  invoices,                       // { id, number, variable_symbol, currency, status, round_total }
  totals: new Map(invoices.map((i) => [i.id, computeTotals(i.items, { roundTotal: i.round_total }).total])),
  transactions,                   // { id, kind, amount, currency, note, occurred_on, variable_symbol? }
});

result.matched;   // [{ transactionId, invoiceId, variableSymbol, total }]
result.unmatched; // [{ transaction, reason, variableSymbol, invoiceId }]
```

The rules are deterministic. A payment matches when it quotes the variable symbol of exactly one issued invoice, in the same currency, for the right amount (to the cent, or within one crown for a CZK invoice rounded to whole crowns). Everything else lands in `unmatched` with a reason: `no-variable-symbol`, `no-open-invoice`, `currency-mismatch`, `amount-mismatch`, `duplicate-payment` or `ambiguous`. When the bank sends the symbol only inside free text, `extractVariableSymbol` reads it from notes such as `VS: 2026001` or `/VS/2026001/SS/0`.

## API

| Export | What it does |
| --- | --- |
| `lineBase`, `lineVat`, `lineTotal` | One invoice line without VAT, its VAT, and with VAT |
| `vatBreakdown` | VAT recap grouped by rate, highest first |
| `computeTotals` | Whole-invoice totals with optional CZK rounding |
| `round2`, `digitsOnly`, `defaultVariableSymbol` | Small helpers |
| `isValidIban`, `normalizeIban`, `ibanCheckDigits` | IBAN validation and check digits |
| `czAccountToIban`, `resolveIban` | Czech account number to IBAN |
| `buildSpayd` | The QR Platba (SPAYD 1.0) payload |
| `matchPayments`, `extractVariableSymbol`, `normalizeSymbol`, `amountTolerance` | Payment matching |

## License

MIT. Extracted from [OwnDashboard](https://github.com/lukaskourilcz/own-dashboard), where it runs the invoices and the bank reconciliation.
