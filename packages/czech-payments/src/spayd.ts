import { normalizeIban } from './iban.js';
import { digitsOnly } from './invoice-math.js';

function spaydMessage(msg: string | null | undefined): string {
  // "*" is the SPAYD field delimiter, so it can't appear inside a value.
  return (msg ?? "").replace(/\*/g, " ").trim().slice(0, 60);
}

export type SpaydInput = {
  iban: string;
  amount: number;
  currency?: string;
  variableSymbol?: string | null;
  constantSymbol?: string | null;
  message?: string | null;
  dueDate?: string | null; // yyyy-MM-dd
};

/**
 * Build a SPAYD (Short Payment Descriptor) string — the payload behind the
 * Czech "QR Platba". Rendered as a QR it lets the payer fill a transfer by
 * scanning. See https://qr-platba.cz / the SPAYD 1.0 spec.
 */
export function buildSpayd(input: SpaydInput): string {
  const fields = ["SPD", "1.0", `ACC:${normalizeIban(input.iban)}`];
  fields.push(`AM:${input.amount.toFixed(2)}`);
  fields.push(`CC:${(input.currency ?? "CZK").toUpperCase()}`);
  const vs = digitsOnly(input.variableSymbol ?? "").slice(0, 10);
  if (vs) fields.push(`X-VS:${vs}`);
  const ks = digitsOnly(input.constantSymbol ?? "").slice(0, 10);
  if (ks) fields.push(`X-KS:${ks}`);
  if (input.dueDate) fields.push(`DT:${input.dueDate.replace(/-/g, "")}`);
  const msg = spaydMessage(input.message);
  if (msg) fields.push(`MSG:${msg}`);
  return fields.join("*");
}
