import {
  ARES_SUBJECT_ENDPOINT,
  EU_VAT_COUNTRIES,
  VIES_CHECK_ENDPOINT,
  isValidIco,
  mapAresSubject,
  mapViesResult,
  normalizeIco,
  parseVatId,
  type AresSubject,
  type ViesResult,
} from './registry.js';

export type RegistryClientOptions = {
  /** A fetch implementation; defaults to the global one (Node 20+, browsers). */
  fetch?: typeof globalThis.fetch;
  /** Abort after this many milliseconds. ARES defaults to 10 s, VIES to 15 s. */
  timeoutMs?: number;
};

export type AresLookup =
  | { kind: 'found'; subject: AresSubject }
  | { kind: 'not-found' }
  | { kind: 'invalid-ico' }
  | { kind: 'error'; status: number | null };

/**
 * Look a company up in ARES by IČO. The IČO is normalised and checksummed
 * first, so a typo never reaches the register. ARES does not allow calls from a
 * browser page on another origin, so call this from a server.
 */
export async function lookupAres(ico: string, options: RegistryClientOptions = {}): Promise<AresLookup> {
  const normalized = normalizeIco(ico);
  if (!isValidIco(normalized)) return { kind: 'invalid-ico' };
  const doFetch = options.fetch ?? globalThis.fetch;
  try {
    const response = await doFetch(`${ARES_SUBJECT_ENDPOINT}/${normalized}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
    });
    if (response.status === 404) return { kind: 'not-found' };
    if (!response.ok) return { kind: 'error', status: response.status };
    const subject = mapAresSubject(await response.json());
    return subject ? { kind: 'found', subject } : { kind: 'not-found' };
  } catch {
    return { kind: 'error', status: null };
  }
}

export type ViesCheck = ViesResult & { vatId: string };

/**
 * Check an EU VAT id with VIES. Returns null when the input is not an EU VAT id
 * VIES covers. A VIES or member-state outage comes back as `unavailable`,
 * never as `invalid`.
 */
export async function checkVies(vatId: string, options: RegistryClientOptions = {}): Promise<ViesCheck | null> {
  const parsed = parseVatId(vatId);
  if (!parsed || !EU_VAT_COUNTRIES.has(parsed.countryCode)) return null;
  const normalized = `${parsed.countryCode}${parsed.number}`;
  const doFetch = options.fetch ?? globalThis.fetch;
  try {
    const response = await doFetch(VIES_CHECK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ countryCode: parsed.countryCode, vatNumber: parsed.number }),
      signal: AbortSignal.timeout(options.timeoutMs ?? 15_000),
    });
    if (!response.ok) return { ...mapViesResult(null), vatId: normalized };
    return { ...mapViesResult(await response.json()), vatId: normalized };
  } catch {
    return { ...mapViesResult(null), vatId: normalized };
  }
}
