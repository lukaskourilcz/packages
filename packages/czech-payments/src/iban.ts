/**
 * IBAN helpers: normalising, the ISO 13616 mod-97 check, and turning a Czech
 * domestic account number ("[prefix-]number/bank") into an IBAN.
 */

function mod97(numeric: string): number {
  let remainder = 0;
  for (const ch of numeric) remainder = (remainder * 10 + Number(ch)) % 97;
  return remainder;
}

/** The two check digits for a country code and BBAN (ISO 13616, mod 97). */
export function ibanCheckDigits(countryCode: string, bban: string): string {
  // Move country code + "00" to the end, turn letters into numbers, mod 97.
  const rearranged = `${bban}${countryCode}00`;
  const numeric = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  return String(98 - mod97(numeric)).padStart(2, "0");
}

/** Normalise an IBAN: strip spaces, upper-case. */
export function normalizeIban(iban: string): string {
  return iban.replace(/\s+/g, "").toUpperCase();
}

/**
 * Whether a string is a structurally valid IBAN: two letters, two check
 * digits, an alphanumeric BBAN of 11–30 characters, and a mod-97 remainder of 1.
 * It does not check the country's own BBAN length or bank codes.
 */
export function isValidIban(iban: string): boolean {
  const value = normalizeIban(iban);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(value)) return false;
  const rearranged = `${value.slice(4)}${value.slice(0, 4)}`;
  const numeric = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  return mod97(numeric) === 1;
}

/**
 * Convert a Czech domestic account number ("[prefix-]number/bank") to IBAN.
 * Returns null if the input doesn't look like a CZ account number.
 * Example: "19-2000145399/0800" → "CZ6508000000192000145399".
 */
export function czAccountToIban(account: string): string | null {
  const cleaned = account.replace(/\s+/g, "");
  const m = cleaned.match(/^(?:(\d{1,6})-)?(\d{1,10})\/(\d{4})$/);
  if (!m) return null;
  const prefix = (m[1] ?? "").padStart(6, "0");
  const number = m[2].padStart(10, "0");
  const bankCode = m[3];
  const bban = `${bankCode}${prefix}${number}`;
  return `CZ${ibanCheckDigits("CZ", bban)}${bban}`;
}

/** Best-effort IBAN for payment QR: explicit IBAN, else derived from account. */
export function resolveIban(
  source: { iban: string | null; bank_account: string | null },
): string | null {
  if (source.iban && source.iban.trim()) return normalizeIban(source.iban);
  if (source.bank_account) return czAccountToIban(source.bank_account);
  return null;
}
