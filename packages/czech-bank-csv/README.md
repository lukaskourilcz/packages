# @lukaskourilcz/czech-bank-csv

Turn a bank statement CSV export into clean transaction rows. Built for Czech banks (Raiffeisenbank, Fio, ČSOB, Komerční banka and others) and tolerant enough for most European exports:

- the delimiter (`;`, `,` or tab) is sniffed from the header row;
- columns are found by accent-insensitive header names, so `Částka`, `castka` and `Amount` all match;
- Czech numbers and dates are understood: `1 234,56`, `1.234,56`, `17.07.2026`;
- negative amounts become expenses, positive ones income;
- a variable symbol column (`Variabilní symbol`, `VS`) is read as digits;
- every row gets a stable `external_id`, so importing the same file twice can be de-duplicated.

No dependencies, no network, runs in the browser and in Node.

## Install

```sh
echo "@lukaskourilcz:registry=https://npm.pkg.github.com" >> .npmrc
npm install @lukaskourilcz/czech-bank-csv
```

## Use

```ts
import { parseBankCsv } from '@lukaskourilcz/czech-bank-csv';

const csv = [
  'Datum zúčtování;Částka;Měna;Název protiúčtu;Variabilní symbol',
  '17.07.2026;-1 234,56;CZK;Albert;',
  '01.07.2026;48 000,00;CZK;ACME s.r.o.;2026001',
].join('\n');

const { rows, errors, columns } = parseBankCsv(csv);
// rows[0] → { occurred_on: '2026-07-17', kind: 'expense', amount: 1234.56, currency: 'CZK',
//             note: 'Albert', external_id: 'csv:…', variable_symbol: null }
// rows[1].variable_symbol → '2026001'
// columns → which header was read as date, amount, currency, note and variable symbol
```

`parseBankCsv(text, fallbackCurrency = 'CZK')` uses the fallback when the file has no currency column. Rows it cannot read are skipped and listed in `errors`, so you can show the person what was left out.

The two cell parsers are exported too:

```ts
import { parseAmount, parseDate } from '@lukaskourilcz/czech-bank-csv';

parseAmount('1 234,56'); // 1234.56
parseDate('1/7/2026');   // '2026-07-01'
```

Pair it with [`@lukaskourilcz/czech-payments`](../czech-payments) to match the imported payments to your invoices by variable symbol.

## Limits

A quoted field may contain the delimiter, but not a line break. Dates must be ISO (`2026-07-17`) or day-first (`17.07.2026`, `17/07/2026`).

## License

MIT. Extracted from [OwnDashboard](https://github.com/lukaskourilcz/own-dashboard).
