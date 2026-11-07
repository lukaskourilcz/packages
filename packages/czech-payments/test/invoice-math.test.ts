import { describe, it, expect } from "vitest";
import {
  computeTotals,
  defaultVariableSymbol,
  lineBase,
  lineTotal,
  lineVat,
  round2,
  vatBreakdown,
  type ItemLike,
} from "../src/index.js";


function item(overrides: Partial<ItemLike> = {}): ItemLike {
  return { quantity: 1, unit_price: 100, vat_rate: 21, ...overrides };
}

describe("line math", () => {
  it("base is quantity × unit price", () => {
    expect(lineBase(item({ quantity: 3, unit_price: 250 }))).toBe(750);
  });
  it("vat applies the rate to the base", () => {
    expect(lineVat(item({ quantity: 1, unit_price: 100, vat_rate: 21 }))).toBe(21);
    expect(lineVat(item({ quantity: 2, unit_price: 100, vat_rate: 12 }))).toBe(24);
    expect(lineVat(item({ vat_rate: 0 }))).toBe(0);
  });
  it("total is base + vat", () => {
    expect(lineTotal(item({ quantity: 1, unit_price: 100, vat_rate: 21 }))).toBe(121);
  });
  it("rounds to halere (2 decimals)", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(lineVat(item({ quantity: 1, unit_price: 99.99, vat_rate: 21 }))).toBe(21);
  });
});

describe("vatBreakdown", () => {
  it("groups by rate, highest first", () => {
    const groups = vatBreakdown([
      item({ unit_price: 100, vat_rate: 21 }),
      item({ unit_price: 200, vat_rate: 12 }),
      item({ unit_price: 50, vat_rate: 21 }),
    ]);
    expect(groups.map((g) => g.rate)).toEqual([21, 12]);
    expect(groups[0]).toMatchObject({ rate: 21, base: 150, vat: 31.5, total: 181.5 });
    expect(groups[1]).toMatchObject({ rate: 12, base: 200, vat: 24, total: 224 });
  });
});

describe("computeTotals", () => {
  it("sums base and VAT for a VAT payer", () => {
    const totals = computeTotals(
      [item({ quantity: 1, unit_price: 1000, vat_rate: 21 })],
      { roundTotal: false, currency: "CZK" },
    );
    expect(totals.subtotal).toBe(1000);
    expect(totals.vatTotal).toBe(210);
    expect(totals.rawTotal).toBe(1210);
    expect(totals.total).toBe(1210);
    expect(totals.rounding).toBe(0);
  });

  it("has no VAT for a non-payer (all 0 %)", () => {
    const totals = computeTotals([
      item({ quantity: 10, unit_price: 500, vat_rate: 0 }),
    ]);
    expect(totals.subtotal).toBe(5000);
    expect(totals.vatTotal).toBe(0);
    expect(totals.total).toBe(5000);
  });

  it("rounds the grand total to whole crowns for CZK when asked", () => {
    const totals = computeTotals(
      [item({ quantity: 1, unit_price: 100.4, vat_rate: 21 })],
      { roundTotal: true, currency: "CZK" },
    );
    // 100.40 + 21.08 = 121.48 → 121
    expect(totals.rawTotal).toBe(121.48);
    expect(totals.total).toBe(121);
    expect(totals.rounding).toBe(-0.48);
  });

  it("does not round non-CZK totals", () => {
    const totals = computeTotals(
      [item({ quantity: 1, unit_price: 100.4, vat_rate: 21 })],
      { roundTotal: true, currency: "EUR" },
    );
    expect(totals.total).toBe(121.48);
    expect(totals.rounding).toBe(0);
  });
});


describe("defaultVariableSymbol", () => {
  it("keeps digits only, capped at 10", () => {
    expect(defaultVariableSymbol("2026001")).toBe("2026001");
    expect(defaultVariableSymbol("FA-2026/001")).toBe("2026001");
  });
});

