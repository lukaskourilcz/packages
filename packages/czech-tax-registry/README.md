# @lukaskourilcz/czech-tax-registry

Validate and look up Czech and EU business identifiers:

- **IČO**: normalise and check the mod-11 checksum before you ever call a register.
- **DIČ / EU VAT id**: parse `CZ 270-743 58` into `{ countryCode: 'CZ', number: '27074358' }` and tell whether VIES covers it (Greece is `EL`, Northern Ireland `XI`, Great Britain is out).
- **ARES**: map the Czech register's response to flat organization fields (name, street with house and orientation numbers, city, ZIP as `140 00`, country, VAT id), and fill a form without overwriting what someone already typed.
- **VIES**: map the EU VAT check and keep a member-state outage (`MS_UNAVAILABLE`, `TIMEOUT`, …) apart from an invalid number, so a real customer is never told their VAT id is wrong because a server was down.

The parsers are pure and run anywhere. `lookupAres` and `checkVies` wrap the two free public APIs with timeouts and an injectable `fetch`; no account or API key is needed.

## Install

```sh
echo "@lukaskourilcz:registry=https://npm.pkg.github.com" >> .npmrc
npm install @lukaskourilcz/czech-tax-registry
```

## Validate

```ts
import { isEuVatId, isValidIco, normalizeVatId } from '@lukaskourilcz/czech-tax-registry';

isValidIco('270 743 58');      // true
isValidIco('27074359');        // false: checksum
normalizeVatId('cz 270-743 58'); // 'CZ27074358'
isEuVatId('GB123456789');      // false: VIES no longer covers GB
```

## Look up a company in ARES

```ts
import { applyAresSubject, lookupAres } from '@lukaskourilcz/czech-tax-registry';

const result = await lookupAres('27074358');
if (result.kind === 'found') {
  result.subject; // { ico, name, address: 'Budějovická 778/3a', city: 'Praha', zip: '140 00', country, vatId }
  const filled = applyAresSubject(formValues, result.subject); // keeps fields already typed, refreshes the legal name
}
// other outcomes: { kind: 'not-found' } | { kind: 'invalid-ico' } | { kind: 'error', status }
```

ARES does not answer browser requests from other origins, so call it from your server.

## Check a VAT id with VIES

```ts
import { checkVies, vatNameMismatch } from '@lukaskourilcz/czech-tax-registry';

const check = await checkVies('CZ27074358');
// { status: 'valid' | 'invalid' | 'unavailable', name, address, vatId: 'CZ27074358' } or null when VIES does not cover the id
if (check?.status === 'valid' && vatNameMismatch(check.name, customer.name)) {
  // the registered name differs from the one on your record
}
```

Already have the raw JSON from your own HTTP layer? Use `mapAresSubject(json)` and `mapViesResult(json)` directly.

## API

| Export | What it does |
| --- | --- |
| `normalizeIco`, `isValidIco` | IČO to eight digits, mod-11 checksum |
| `parseVatId`, `normalizeVatId`, `isEuVatId`, `EU_VAT_COUNTRIES` | VAT id parsing and VIES coverage |
| `mapAresSubject`, `applyAresSubject` | ARES response to fields, form fill |
| `mapViesResult`, `vatNameMismatch` | VIES response to a verdict, name comparison |
| `lookupAres`, `checkVies` | The network calls, with timeouts and an injectable `fetch` |
| `ARES_SUBJECT_ENDPOINT`, `VIES_CHECK_ENDPOINT` | The public endpoints |

## License

MIT. Extracted from [OwnDashboard](https://github.com/lukaskourilcz/own-dashboard).
