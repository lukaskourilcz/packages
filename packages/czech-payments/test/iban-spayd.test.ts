import { describe, it, expect } from "vitest";
import { buildSpayd, czAccountToIban, ibanCheckDigits, isValidIban, normalizeIban, resolveIban } from "../src/index.js";

describe("czAccountToIban", () => {
  it("converts a prefixed account number", () => {
    expect(czAccountToIban("19-2000145399/0800")).toBe(
      "CZ6508000000192000145399",
    );
  });
  it("converts a plain account number", () => {
    expect(czAccountToIban("2000145399/0800")).toBe(
      "CZ7908000000002000145399",
    );
  });
  it("returns null for non-account input", () => {
    expect(czAccountToIban("not an account")).toBeNull();
    expect(czAccountToIban("CZ6508000000192000145399")).toBeNull();
  });
});

describe("resolveIban", () => {
  it("prefers an explicit IBAN", () => {
    expect(
      resolveIban({ iban: "CZ65 0800 0000 1920 0014 5399", bank_account: "1/0100" }),
    ).toBe("CZ6508000000192000145399");
  });
  it("derives from the account number when no IBAN", () => {
    expect(resolveIban({ iban: null, bank_account: "19-2000145399/0800" })).toBe(
      "CZ6508000000192000145399",
    );
  });
  it("is null without either", () => {
    expect(resolveIban({ iban: null, bank_account: null })).toBeNull();
  });
});

describe("buildSpayd", () => {
  it("builds a minimal valid SPAYD string", () => {
    expect(
      buildSpayd({ iban: "CZ6508000000192000145399", amount: 1210 }),
    ).toBe("SPD*1.0*ACC:CZ6508000000192000145399*AM:1210.00*CC:CZK");
  });
  it("includes VS, due date and a sanitised message", () => {
    const s = buildSpayd({
      iban: "CZ6508000000192000145399",
      amount: 1500.5,
      currency: "CZK",
      variableSymbol: "2026001",
      message: "Faktura *2026001*",
      dueDate: "2026-06-29",
    });
    expect(s).toBe(
      "SPD*1.0*ACC:CZ6508000000192000145399*AM:1500.50*CC:CZK*X-VS:2026001*DT:20260629*MSG:Faktura  2026001",
    );
  });
});

describe("isValidIban", () => {
  it("accepts IBANs whose mod-97 remainder is 1, with or without spaces", () => {
    expect(isValidIban("CZ6508000000192000145399")).toBe(true);
    expect(isValidIban("cz65 0800 0000 1920 0014 5399")).toBe(true);
    expect(isValidIban("GB82WEST12345698765432")).toBe(true);
  });
  it("rejects a wrong check digit, a bad shape or an empty string", () => {
    expect(isValidIban("CZ6608000000192000145399")).toBe(false);
    expect(isValidIban("CZ65080000001920001453")).toBe(false);
    expect(isValidIban("1234")).toBe(false);
    expect(isValidIban("")).toBe(false);
  });
  it("agrees with every IBAN czAccountToIban produces", () => {
    for (const account of ["19-2000145399/0800", "2000145399/0800", "123/0100"]) {
      expect(isValidIban(czAccountToIban(account)!)).toBe(true);
    }
  });
});

describe("normalizeIban and ibanCheckDigits", () => {
  it("strips spaces and upper-cases", () => {
    expect(normalizeIban(" cz65 0800 ")).toBe("CZ650800");
  });
  it("computes the check digits for a Czech BBAN", () => {
    expect(ibanCheckDigits("CZ", "08000000192000145399")).toBe("65");
  });
});
