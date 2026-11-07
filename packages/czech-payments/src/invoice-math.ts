/**
 * Invoice arithmetic the Czech way: line totals, a VAT recap (rekapitulace DPH)
 * grouped by rate, and an optional rounding of a CZK total to whole crowns
 * reported as its own line.
 */

// Czech VAT rates as of 2024: 21 % základní, 12 % snížená, 0 %.
export const VAT_RATES = [21, 12, 0] as const;

// Common units (měrné jednotky) offered as suggestions on item rows.
export const UNIT_SUGGESTIONS = ["ks", "hod", "den", "měsíc", "kg", "m", "%"] as const;

/** Round to 2 decimals, nudging away from binary float error. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export type ItemLike = {
  quantity: number;
  unit_price: number;
  vat_rate: number;
};

/** Line total without VAT (množství × cena/MJ). */
export function lineBase(item: Pick<ItemLike, "quantity" | "unit_price">): number {
  return round2(item.quantity * item.unit_price);
}

/** VAT amount for a single line. */
export function lineVat(item: ItemLike): number {
  return round2(lineBase(item) * (item.vat_rate / 100));
}

/** Line total including VAT. */
export function lineTotal(item: ItemLike): number {
  return round2(lineBase(item) + lineVat(item));
}

export type VatRateGroup = {
  rate: number;
  base: number; // základ daně
  vat: number; // daň
  total: number; // s daní
};

/** Group lines by VAT rate (rekapitulace DPH), highest rate first. */
export function vatBreakdown(items: ItemLike[]): VatRateGroup[] {
  const map = new Map<number, VatRateGroup>();
  for (const it of items) {
    const g = map.get(it.vat_rate) ?? { rate: it.vat_rate, base: 0, vat: 0, total: 0 };
    g.base = round2(g.base + lineBase(it));
    g.vat = round2(g.vat + lineVat(it));
    g.total = round2(g.base + g.vat);
    map.set(it.vat_rate, g);
  }
  return [...map.values()].sort((a, b) => b.rate - a.rate);
}

export type InvoiceTotals = {
  subtotal: number; // základ (bez DPH)
  vatTotal: number; // DPH celkem
  rawTotal: number; // subtotal + vatTotal, před zaokrouhlením
  total: number; // k úhradě (po zaokrouhlení)
  rounding: number; // total − rawTotal
  breakdown: VatRateGroup[];
};

/**
 * Whole-invoice totals. When `roundTotal` is on and the currency is CZK, the
 * grand total is rounded to whole crowns (a Czech convention) and the rounding
 * delta is reported separately so it can show as a "Zaokrouhlení" line.
 */
export function computeTotals(
  items: ItemLike[],
  opts: { roundTotal?: boolean; currency?: string } = {},
): InvoiceTotals {
  const subtotal = round2(items.reduce((s, it) => s + lineBase(it), 0));
  const vatTotal = round2(items.reduce((s, it) => s + lineVat(it), 0));
  const rawTotal = round2(subtotal + vatTotal);
  const shouldRound = (opts.roundTotal ?? false) && (opts.currency ?? "CZK") === "CZK";
  const total = shouldRound ? Math.round(rawTotal) : rawTotal;
  const rounding = round2(total - rawTotal);
  return { subtotal, vatTotal, rawTotal, total, rounding, breakdown: vatBreakdown(items) };
}

/** Strip everything but digits (e.g. to derive a variable symbol). */
export function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

/** Variable symbol defaults to the digits of the invoice number (max 10). */
export function defaultVariableSymbol(invoiceNumber: string): string {
  return digitsOnly(invoiceNumber).slice(0, 10);
}
