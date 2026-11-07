import { describe, expect, it } from "vitest";
import { checkVies, lookupAres } from "../src/index.js";

type Call = { url: string; init: RequestInit | undefined };

function fakeFetch(status: number, body: unknown, calls: Call[] = []): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(body === undefined ? null : JSON.stringify(body), { status });
  }) as typeof fetch;
}

const failingFetch = (async () => {
  throw new Error("network down");
}) as typeof fetch;

describe("lookupAres", () => {
  it("refuses an IČO that fails the checksum without calling ARES", async () => {
    const calls: Call[] = [];
    expect(await lookupAres("27074359", { fetch: fakeFetch(200, {}, calls) })).toEqual({ kind: "invalid-ico" });
    expect(calls).toHaveLength(0);
  });

  it("normalises the IČO into the URL and maps the subject", async () => {
    const calls: Call[] = [];
    const result = await lookupAres("270 743 58", {
      fetch: fakeFetch(200, { ico: "27074358", obchodniJmeno: "Asseco Central Europe, a.s.", sidlo: { nazevObce: "Praha", psc: 14000 } }, calls),
    });
    expect(calls[0]?.url).toMatch(/\/ekonomicke-subjekty\/27074358$/);
    expect(result).toMatchObject({ kind: "found", subject: { ico: "27074358", city: "Praha", zip: "140 00" } });
  });

  it("reports a missing subject and other failures separately", async () => {
    expect(await lookupAres("27074358", { fetch: fakeFetch(404, { kod: "NENALEZENO" }) })).toEqual({ kind: "not-found" });
    expect(await lookupAres("27074358", { fetch: fakeFetch(500, {}) })).toEqual({ kind: "error", status: 500 });
    expect(await lookupAres("27074358", { fetch: failingFetch })).toEqual({ kind: "error", status: null });
  });
});

describe("checkVies", () => {
  it("returns null for anything VIES does not cover", async () => {
    expect(await checkVies("GB123456789", { fetch: fakeFetch(200, {}) })).toBeNull();
    expect(await checkVies("not a vat id", { fetch: fakeFetch(200, {}) })).toBeNull();
  });

  it("posts the country and number and maps a valid answer", async () => {
    const calls: Call[] = [];
    const result = await checkVies("CZ 270 743 58", {
      fetch: fakeFetch(200, { valid: true, name: "Asseco Central Europe, a.s.", address: "Budějovická 778/3a\nPraha 4" }, calls),
    });
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ countryCode: "CZ", vatNumber: "27074358" });
    expect(result).toEqual({ status: "valid", name: "Asseco Central Europe, a.s.", address: "Budějovická 778/3a, Praha 4", vatId: "CZ27074358" });
  });

  it("treats an outage as unavailable, never as invalid", async () => {
    expect((await checkVies("CZ27074358", { fetch: fakeFetch(200, { userError: "MS_UNAVAILABLE" }) }))?.status).toBe("unavailable");
    expect((await checkVies("CZ27074358", { fetch: fakeFetch(503, {}) }))?.status).toBe("unavailable");
    expect((await checkVies("CZ27074358", { fetch: failingFetch }))?.status).toBe("unavailable");
  });
});
