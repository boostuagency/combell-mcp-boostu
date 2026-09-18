import { describe, it, expect, vi } from "vitest";
import { CombellAuth } from "../src/api/auth.js";
import { CombellApiError, CombellClient, parsePaging } from "../src/api/client.js";
import { p } from "../src/lib/path.js";

function res(status: number, body: unknown = undefined, headers: Record<string, string> = {}): Response {
  const text = body === undefined ? "" : typeof body === "string" ? body : JSON.stringify(body);
  // Response forbids a body on 204/303/etc.; the client reads text() which is "" for null bodies.
  return new Response(text === "" ? null : text, { status, headers });
}

function makeClient(fetchMock: ReturnType<typeof vi.fn>, opts: Record<string, unknown> = {}) {
  const auth = new CombellAuth({ apiKey: "k", apiSecret: "s" });
  return new CombellClient(auth, { fetch: fetchMock as unknown as typeof fetch, ...opts });
}

describe("CombellClient", () => {
  it("signs and sends a GET with the /v2 prefix, query string and hmac header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(res(200, [{ id: 1 }], { "x-paging-skipped": "0", "x-paging-take": "1", "x-paging-totalresults": "7" }));
    const client = makeClient(fetchMock);
    const out = await client.get<{ id: number }[]>("/accounts", { take: 1, skip: undefined, identifier: "example.be" });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.combell.com/v2/accounts?take=1&identifier=example.be");
    expect(init.method).toBe("GET");
    expect(init.redirect).toBe("manual");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toMatch(/^hmac k:[A-Za-z0-9+/=]+:[0-9a-f]{32}:\d+$/);
    expect(headers["Content-Type"]).toBeUndefined();
    expect(out.data).toEqual([{ id: 1 }]);
    expect(out.paging).toEqual({ skipped: 0, take: 1, total: 7 });
  });

  it("sends JSON bodies with a content-type and signs the exact serialised body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(res(204));
    const client = makeClient(fetchMock);
    const out = await client.put(p`/mailboxes/${"info@example.be"}/autoreply`, { enabled: true });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.combell.com/v2/mailboxes/info%40example.be/autoreply");
    expect(init.body).toBe('{"enabled":true}');
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(out.status).toBe(204);
    expect(out.data).toBeUndefined();
  });

  it("exposes the Location header on 202/201 responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(res(202, undefined, { location: "https://api.combell.com/v2/provisioningjobs/job-9" }));
    const client = makeClient(fetchMock);
    const out = await client.post("/accounts", { identifier: "x" });
    expect(out.status).toBe(202);
    expect(out.location).toBe("https://api.combell.com/v2/provisioningjobs/job-9");
  });

  it("does not follow 303 and returns it when allowed", async () => {
    const fetchMock = vi.fn().mockResolvedValue(res(303, undefined, { location: "https://api.combell.com/v2/sslcertificates/abc" }));
    const client = makeClient(fetchMock);
    const out = await client.get("/sslcertificaterequests/1", undefined, [303, 410]);
    expect(out.status).toBe(303);
    expect(out.location).toContain("/sslcertificates/abc");
  });

  it("throws a CombellApiError with validation errors on 400", async () => {
    const fetchMock = vi.fn().mockResolvedValue(res(400, { validation_errors: [{ error_code: "invalid_password", error_text: "Password too short" }] }));
    const client = makeClient(fetchMock);
    const err = await client.post("/mailboxes", {}).catch((e) => e);
    expect(err).toBeInstanceOf(CombellApiError);
    expect(err.status).toBe(400);
    expect(err.validationErrors).toEqual([{ error_code: "invalid_password", error_text: "Password too short" }]);
    expect(err.message).toContain("invalid_password: Password too short");
    expect(err.message).toContain("POST /v2/mailboxes");
  });

  it("adds an IP whitelisting hint on 401", async () => {
    const fetchMock = vi.fn().mockResolvedValue(res(401, ""));
    const client = makeClient(fetchMock);
    await expect(client.get("/domains")).rejects.toThrow(/whitelisted/);
  });

  it("retries once on 429 when Retry-After is small, then surfaces the error", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(res(429, "Too many requests", { "retry-after": "0", "x-ratelimit-reset": "0" }))
      .mockResolvedValueOnce(res(200, { ok: true }));
    const client = makeClient(fetchMock);
    const out = await client.get("/domains");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(out.data).toEqual({ ok: true });

    const slow = vi.fn().mockResolvedValue(res(429, "Too many requests", { "retry-after": "60" }));
    const client2 = makeClient(slow);
    const err = await client2.get("/domains").catch((e) => e);
    expect(slow).toHaveBeenCalledTimes(1);
    expect(err.status).toBe(429);
    expect(err.retryAfter).toBe(60);
  });

  it("honours a custom base URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(res(200, []));
    const client = makeClient(fetchMock, { baseUrl: "https://sandbox.example/" });
    await client.get("/domains");
    expect((fetchMock.mock.calls[0] as [string])[0]).toBe("https://sandbox.example/v2/domains");
  });
});

describe("parsePaging", () => {
  it("returns undefined when no paging headers are present", () => {
    expect(parsePaging(new Headers())).toBeUndefined();
  });
});
