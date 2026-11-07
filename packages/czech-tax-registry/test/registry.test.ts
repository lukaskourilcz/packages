import { describe, expect, it } from "vitest";
import {
  applyAresSubject,
  EU_VAT_COUNTRIES,
  isEuVatId,
  isValidIco,
  mapAresSubject,
  mapViesResult,
  normalizeIco,
  normalizeVatId,
  parseVatId,
  vatNameMismatch,
  type AresSubject,
} from "../src/index.js";

// Trimmed from a real ares.gov.cz/ekonomicke-subjekty-v-be response. Numbers
// stay numbers on purpose: psc and cisloDomovni arrive unquoted.
const ARES_SUBJECT = {
  ico: "27074358",
  obchodniJmeno: "Asseco Central Europe, a.s.",
  dic: "CZ27074358",
  pravniForma: "121",
  sidlo: {
    kodStatu: "CZ",
    nazevStatu: "Česká republika",
    nazevObce: "Praha",
    nazevUlice: "Budějovická",
    cisloDomovni: 778,
    cisloOrientacni: 3,
    cisloOrientacniPismeno: "a",
    nazevCastiObce: "Michle",
    psc: 14000,
    textovaAdresa: "Budějovická 778/3a, Michle, 14000 Praha 4",
  },
};

describe("IČO", () => {
  it("normalizes separators and pads to eight digits", () => {
    expect(normalizeIco(" 270 743 58 ")).toBe("27074358");
    expect(normalizeIco("45274649")).toBe("45274649");
    expect(normalizeIco("1234")).toBe("00001234");
    expect(normalizeIco("")).toBe("");
    expect(normalizeIco(null)).toBe("");
  });

  it("accepts a valid mod-11 checksum and rejects a wrong one", () => {
    expect(isValidIco("27074358")).toBe(true);
    expect(isValidIco("CZ 270 743 58")).toBe(true);
    // Same digits, last one changed.
    expect(isValidIco("27074357")).toBe(false);
    expect(isValidIco("87654321")).toBe(false);
    expect(isValidIco("123456789")).toBe(false);
    expect(isValidIco("")).toBe(false);
  });
});

describe("VAT id", () => {
  it("parses a country code and number through human formatting", () => {
    expect(parseVatId("CZ 270-743.58")).toEqual({ countryCode: "CZ", number: "27074358" });
    expect(parseVatId("cz27074358")).toEqual({ countryCode: "CZ", number: "27074358" });
    expect(parseVatId("XX123")).toEqual({ countryCode: "XX", number: "123" });
    expect(parseVatId("27074358")).toBeNull();
    expect(parseVatId("C")).toBeNull();
    expect(parseVatId(null)).toBeNull();
  });

  it("normalizes to the canonical form", () => {
    expect(normalizeVatId(" cz 270 743 58 ")).toBe("CZ27074358");
    // Letters inside the number are legitimate (IE and NL both use them).
    expect(normalizeVatId("ie 1234567 fa")).toBe("IE1234567FA");
    expect(normalizeVatId("27074358")).toBe("");
    expect(normalizeVatId("?!")).toBe("");
  });

  it("knows which numbers VIES answers for", () => {
    expect(isEuVatId("CZ27074358")).toBe(true);
    // Greece files under EL, Northern Ireland under XI.
    expect(isEuVatId("EL123456789")).toBe(true);
    expect(isEuVatId("XI123456789")).toBe(true);
    // VIES no longer covers Great Britain.
    expect(isEuVatId("GB123456789")).toBe(false);
    expect(isEuVatId("US123456789")).toBe(false);
    expect(isEuVatId("")).toBe(false);
    expect(EU_VAT_COUNTRIES.has("GR")).toBe(false);
  });
});

describe("mapAresSubject", () => {
  it("maps a real subject onto the organization fields", () => {
    expect(mapAresSubject(ARES_SUBJECT)).toEqual({
      ico: "27074358",
      name: "Asseco Central Europe, a.s.",
      address: "Budějovická 778/3a",
      city: "Praha",
      zip: "140 00",
      country: "Česká republika",
      vatId: "CZ27074358",
    });
  });

  it("falls back to the textual address when the seat has no street", () => {
    const subject = mapAresSubject({
      ico: "27074358",
      obchodniJmeno: "Bez ulice s.r.o.",
      sidlo: { textovaAdresa: "Michle 12, 14000 Praha 4", nazevObce: "Praha" },
    });
    expect(subject?.address).toBe("Michle 12");
  });

  it("never throws on a partial, empty or malformed payload", () => {
    expect(mapAresSubject({ ico: "27074358" })).toMatchObject({ name: "", address: "", vatId: "" });
    expect(mapAresSubject({})).toBeNull();
    expect(mapAresSubject(null)).toBeNull();
    expect(mapAresSubject("not json")).toBeNull();
    expect(mapAresSubject([ARES_SUBJECT])).toBeNull();
  });
});

describe("applyAresSubject", () => {
  const subject: AresSubject = {
    ico: "27074358",
    name: "Asseco Central Europe, a.s.",
    address: "Budějovická 778/3a",
    city: "Praha",
    zip: "140 00",
    country: "Česká republika",
    vatId: "CZ27074358",
  };

  it("fills empty fields and refreshes the registered name", () => {
    expect(applyAresSubject(
      { name: "Asseco", address: "", city: "", zip: "", country: "", vatId: "" },
      subject,
    )).toEqual({
      name: "Asseco Central Europe, a.s.",
      address: "Budějovická 778/3a",
      city: "Praha",
      zip: "140 00",
      country: "Česká republika",
      vatId: "CZ27074358",
    });
  });

  it("keeps everything the owner already typed apart from the name", () => {
    const typed = {
      name: "Asseco", address: "Fakturační 1", city: "Brno", zip: "602 00",
      country: "Czechia", vatId: "CZ11111111",
    };
    expect(applyAresSubject(typed, subject)).toEqual({ ...typed, name: subject.name });
  });

  it("keeps the typed name when the register returns none", () => {
    const empty: AresSubject = { ico: "", name: "", address: "", city: "", zip: "", country: "", vatId: "" };
    expect(applyAresSubject({ name: "Typed", address: "", city: "", zip: "", country: "", vatId: "" }, empty).name)
      .toBe("Typed");
  });
});

describe("mapViesResult", () => {
  it("reads a valid answer and strips the placeholder dashes", () => {
    expect(mapViesResult({
      countryCode: "CZ", vatNumber: "27074358", valid: true,
      name: "Asseco Central Europe, a.s.",
      address: "Budějovická 778/3a\nPRAHA 4 - MICHLE\n140 00  PRAHA 4",
    })).toEqual({
      status: "valid",
      name: "Asseco Central Europe, a.s.",
      address: "Budějovická 778/3a, PRAHA 4 - MICHLE, 140 00  PRAHA 4",
    });
  });

  it("reads an invalid answer", () => {
    expect(mapViesResult({ valid: false, name: "---", address: "---" }))
      .toEqual({ status: "invalid", name: "", address: "" });
  });

  it("treats a member-state outage as unavailable, never as invalid", () => {
    for (const userError of ["MS_UNAVAILABLE", "TIMEOUT", "SERVICE_UNAVAILABLE"]) {
      expect(mapViesResult({ valid: false, userError }).status).toBe("unavailable");
    }
    expect(mapViesResult({ valid: true, userError: "VALID" }).status).toBe("valid");
    expect(mapViesResult({}).status).toBe("unavailable");
    expect(mapViesResult(null).status).toBe("unavailable");
  });
});


describe("vatNameMismatch", () => {
  it("ignores case and whitespace", () => {
    expect(vatNameMismatch("Acme  s.r.o.", "ACME S.R.O.")).toBe(false);
    expect(vatNameMismatch("Acme s.r.o.", "Acme Group s.r.o.")).toBe(true);
  });

  it("stays quiet when either name is missing", () => {
    expect(vatNameMismatch("Acme s.r.o.", null)).toBe(false);
    expect(vatNameMismatch("", "Acme s.r.o.")).toBe(false);
  });
});

