import { describe, it, expect } from "vitest";
import { enabledGroups, isGroupEnabled } from "../src/lib/toolFilter.js";

describe("toolFilter", () => {
  it("returns null (all enabled) when env unset/empty", () => {
    expect(enabledGroups(undefined)).toBeNull();
    expect(enabledGroups("")).toBeNull();
    expect(enabledGroups("   ")).toBeNull();
  });
  it("parses a comma list into a trimmed set", () => {
    const set = enabledGroups("dns, domains ,mailboxes");
    expect([...set!].sort()).toEqual(["dns", "domains", "mailboxes"]);
  });
  it("isGroupEnabled true for everything when null", () => {
    expect(isGroupEnabled("anything", null)).toBe(true);
  });
  it("isGroupEnabled respects the set", () => {
    const set = enabledGroups("dns");
    expect(isGroupEnabled("dns", set)).toBe(true);
    expect(isGroupEnabled("ssl", set)).toBe(false);
  });
});
