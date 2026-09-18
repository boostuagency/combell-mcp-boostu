import { describe, it, expect } from "vitest";
import { createHash, createHmac } from "node:crypto";
import { CombellAuth, contentHash, encodePathForSignature, rfc3986Encode } from "../src/api/auth.js";

describe("rfc3986Encode", () => {
  it("encodes reserved characters with uppercase hex and leaves unreserved ones", () => {
    expect(rfc3986Encode("/v2/accounts?take=10&skip=0")).toBe("%2Fv2%2Faccounts%3Ftake%3D10%26skip%3D0");
    expect(rfc3986Encode("info@example.be")).toBe("info%40example.be");
    expect(rfc3986Encode("a-b_c.d~e")).toBe("a-b_c.d~e");
  });
  it("also encodes !'()* which encodeURIComponent leaves alone", () => {
    expect(rfc3986Encode("*.example.be")).toBe("%2A.example.be");
    expect(rfc3986Encode("it's (ok)!")).toBe("it%27s%20%28ok%29%21");
  });
});

describe("encodePathForSignature", () => {
  it("lowercases before encoding, as the API requires", () => {
    expect(encodePathForSignature("/v2/DNS/Example.BE/records?Type=MX")).toBe("%2Fv2%2Fdns%2Fexample.be%2Frecords%3Ftype%3Dmx");
  });
});

describe("contentHash", () => {
  it("is empty for no body and Base64(MD5(body)) otherwise", () => {
    expect(contentHash(undefined)).toBe("");
    expect(contentHash("")).toBe("");
    const body = JSON.stringify({ enabled: true });
    expect(contentHash(body)).toBe(createHash("md5").update(body, "utf8").digest("base64"));
  });
});

describe("CombellAuth", () => {
  const auth = new CombellAuth({ apiKey: "my-key", apiSecret: "my-secret" });

  it("builds the string-to-sign in the documented order", () => {
    const s = auth.stringToSign({ method: "GET", pathWithQuery: "/v2/accounts?take=5", timestamp: 1700000000, nonce: "abc" });
    expect(s).toBe("my-key" + "get" + "%2Fv2%2Faccounts%3Ftake%3D5" + "1700000000" + "abc" + "");
  });

  it("appends the MD5 of the body when present", () => {
    const body = '{"enabled":true}';
    const s = auth.stringToSign({ method: "PUT", pathWithQuery: "/v2/x", timestamp: 1, nonce: "n", body });
    expect(s.endsWith(createHash("md5").update(body).digest("base64"))).toBe(true);
  });

  it("produces a Base64 HMAC-SHA256 signature and the hmac Authorization header", () => {
    const sig = auth.sign({ method: "post", pathWithQuery: "/v2/mailboxes", body: '{"a":1}', timestamp: 1700000000, nonce: "nonce-1" });
    const expected = createHmac("sha256", "my-secret")
      .update("my-key" + "post" + "%2Fv2%2Fmailboxes" + "1700000000" + "nonce-1" + createHash("md5").update('{"a":1}').digest("base64"))
      .digest("base64");
    expect(sig.signature).toBe(expected);
    expect(sig.header).toBe(`hmac my-key:${expected}:nonce-1:1700000000`);
    expect(sig.nonce).toBe("nonce-1");
    expect(sig.timestamp).toBe(1700000000);
  });

  it("generates a fresh nonce and a seconds timestamp by default", () => {
    const before = Math.floor(Date.now() / 1000);
    const a = auth.sign({ method: "GET", pathWithQuery: "/v2/domains" });
    const b = auth.sign({ method: "GET", pathWithQuery: "/v2/domains" });
    expect(a.nonce).not.toBe(b.nonce);
    expect(a.nonce).toMatch(/^[0-9a-f]{32}$/);
    expect(a.timestamp).toBeGreaterThanOrEqual(before);
    expect(a.timestamp).toBeLessThan(before + 5);
  });

  it("refuses to sign without credentials and reports it", () => {
    const empty = new CombellAuth({ apiKey: "", apiSecret: "" });
    expect(empty.isConfigured()).toBe(false);
    expect(() => empty.sign({ method: "GET", pathWithQuery: "/v2/domains" })).toThrow(/COMBELL_API_KEY/);
  });
});
