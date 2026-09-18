import { describe, it, expect } from "vitest";
import { buildQuery, p } from "../src/lib/path.js";

describe("p (path template)", () => {
  it("encodes interpolated segments and keeps the literal path", () => {
    expect(p`/dns/${"example.be"}/records/${42}`).toBe("/dns/example.be/records/42");
    expect(p`/mailzones/${"example.be"}/catchall/${"all@example.be"}`).toBe("/mailzones/example.be/catchall/all%40example.be");
    expect(p`/x/${"a/b?c"}`).toBe("/x/a%2Fb%3Fc");
  });
});

describe("buildQuery", () => {
  it("skips undefined, null and empty values", () => {
    expect(buildQuery({ skip: 0, take: undefined, type: null, record_name: "" })).toBe("?skip=0");
    expect(buildQuery(undefined)).toBe("");
    expect(buildQuery({})).toBe("");
  });
  it("encodes values", () => {
    expect(buildQuery({ identifier: "a b&c" })).toBe("?identifier=a%20b%26c");
  });
});
