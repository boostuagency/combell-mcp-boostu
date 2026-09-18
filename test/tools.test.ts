/**
 * Behavioural tests for tool handlers: drive createServer with a fake client and call
 * the registered handlers directly, asserting the exact API calls they make.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ApiResponse } from "../src/api/client.js";

type Handler = (args: Record<string, unknown>) => Promise<{ content: { text: string }[]; isError?: boolean }>;
const handlers = new Map<string, Handler>();

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: class {
    constructor(_opts: unknown) {}
    registerTool(name: string, _config: unknown, cb: Handler) { handlers.set(name, cb); }
  },
}));

function ok<T>(data: T, extra: Partial<ApiResponse<T>> = {}): ApiResponse<T> {
  return { status: 200, data, rateLimit: {}, ...extra };
}

function fakeClient() {
  return { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), request: vi.fn() };
}

async function call(name: string, args: Record<string, unknown>) {
  const h = handlers.get(name);
  if (!h) throw new Error(`tool ${name} not registered`);
  const out = await h(args);
  return { ...out, json: () => JSON.parse(out.content[0].text) };
}

let client = fakeClient();
beforeEach(async () => {
  handlers.clear();
  client = fakeClient();
  const { createServer } = await import("../src/server.js");
  createServer(client as never);
});

describe("dns tools", () => {
  it("list passes filters as query and shapes paging", async () => {
    client.get.mockResolvedValue(ok([{ id: "1", type: "A" }], { paging: { skipped: 0, take: 1, total: 3 } }));
    const out = await call("combell_dns_records_list", { domain_name: "example.be", type: "A", take: 1 });
    expect(client.get).toHaveBeenCalledWith("/dns/example.be/records", { skip: undefined, take: 1, type: "A", record_name: undefined, service: undefined });
    expect(out.json()).toEqual({ items: [{ id: "1", type: "A" }], paging: { skipped: 0, take: 1, total: 3 } });
  });

  it("create posts only the defined record fields and reports the new id", async () => {
    client.post.mockResolvedValue(ok(undefined, { status: 201, location: "https://api.combell.com/v2/dns/example.be/records/55" }));
    const out = await call("combell_dns_records_create", { domain_name: "example.be", type: "MX", record_name: "@", content: "mail.example.be", priority: 10 });
    expect(client.post).toHaveBeenCalledWith("/dns/example.be/records", { type: "MX", record_name: "@", content: "mail.example.be", priority: 10 });
    expect(out.json()).toMatchObject({ created: true, id: "55", domain_name: "example.be" });
  });

  it("update reads the current record and merges only the passed fields", async () => {
    client.get.mockResolvedValue(ok({ id: "55", type: "A", record_name: "www", ttl: 3600, content: "1.2.3.4" }));
    client.put.mockResolvedValue(ok(undefined));
    const out = await call("combell_dns_records_update", { domain_name: "example.be", record_id: "55", content: "5.6.7.8" });
    expect(client.get).toHaveBeenCalledWith("/dns/example.be/records/55");
    expect(client.put).toHaveBeenCalledWith("/dns/example.be/records/55", { id: "55", type: "A", record_name: "www", ttl: 3600, content: "5.6.7.8" });
    expect(out.json()).toMatchObject({ success: true, action: "record_updated" });
  });

  it("delete calls DELETE on the record path", async () => {
    client.delete.mockResolvedValue(ok(undefined, { status: 204 }));
    await call("combell_dns_records_delete", { domain_name: "example.be", record_id: "55" });
    expect(client.delete).toHaveBeenCalledWith("/dns/example.be/records/55");
  });

  it("returns an isError result with the API message when the client throws", async () => {
    client.get.mockRejectedValue(new Error("Combell API error [GET /v2/dns/x/records]: 404 Not Found"));
    const out = await call("combell_dns_records_list", { domain_name: "x" });
    expect(out.isError).toBe(true);
    expect(out.content[0].text).toContain("404");
  });
});

describe("accounts and provisioning", () => {
  it("create account returns the provisioning job to poll", async () => {
    client.post.mockResolvedValue(ok(undefined, { status: 202, location: "https://api.combell.com/v2/provisioningjobs/j-1" }));
    const out = await call("combell_accounts_create", { identifier: "example.be", servicepack_id: 12 });
    expect(client.post).toHaveBeenCalledWith("/accounts", { identifier: "example.be", servicepack_id: 12 });
    expect(out.json()).toMatchObject({ accepted: true, provisioning_job_id: "j-1" });
  });

  it("provisioning job get reports finished with resource links on 201", async () => {
    client.get.mockResolvedValue(ok({ id: "j-1", resource_links: ["/v2/accounts/9"] }, { status: 201, location: "/v2/accounts/9" }));
    const out = await call("combell_provisioning_jobs_get", { job_id: "j-1" });
    expect(out.json()).toEqual({ id: "j-1", status: "finished", resource_links: ["/v2/accounts/9"], location: "/v2/accounts/9" });
  });

  it("provisioning job get passes through an ongoing job", async () => {
    client.get.mockResolvedValue(ok({ id: "j-1", status: "ongoing", completion: { estimate: "2026-01-01T00:00:00Z" } }));
    const out = await call("combell_provisioning_jobs_get", { job_id: "j-1" });
    expect(out.json()).toMatchObject({ status: "ongoing" });
  });
});

describe("domains", () => {
  it("register sends the registrant without undefined fields", async () => {
    client.post.mockResolvedValue(ok(undefined, { status: 202 }));
    await call("combell_domains_register", {
      domain_name: "example.be",
      registrant: { first_name: "A", last_name: "B", address: "Straat 1", postal_code: "2200", city: "Herentals", country_code: "BE", email: "a@b.be", phone: "+32.123456789", company_name: undefined },
    });
    const body = client.post.mock.calls[0][1] as { registrant: Record<string, unknown> };
    expect(client.post.mock.calls[0][0]).toBe("/domains/registrations");
    expect(body.registrant).not.toHaveProperty("company_name");
    expect(body).not.toHaveProperty("name_servers");
  });

  it("set nameservers PUTs domain_name + name_servers", async () => {
    client.put.mockResolvedValue(ok(undefined, { status: 204 }));
    await call("combell_domains_set_nameservers", { domain_name: "example.be", name_servers: ["ns1.x", "ns2.x"] });
    expect(client.put).toHaveBeenCalledWith("/domains/example.be/nameservers", { domain_name: "example.be", name_servers: ["ns1.x", "ns2.x"] });
  });
});

describe("scheduled tasks", () => {
  it("update merges over the current task", async () => {
    client.get.mockResolvedValue(ok({ id: "t1", enabled: true, cron_expression: "*/5 * * * *", script_location: "/www/a.php" }));
    client.put.mockResolvedValue(ok(undefined, { status: 204 }));
    await call("combell_scheduled_tasks_update", { domain_name: "example.be", scheduled_task_id: "t1", enabled: false });
    expect(client.put).toHaveBeenCalledWith("/linuxhostings/example.be/scheduledtasks/t1", { id: "t1", enabled: false, cron_expression: "*/5 * * * *", script_location: "/www/a.php" });
  });
});

describe("mail", () => {
  it("mailboxes list requires a domain filter query", async () => {
    client.get.mockResolvedValue(ok([{ name: "info@example.be" }]));
    await call("combell_mailboxes_list", { domain_name: "example.be" });
    expect(client.get).toHaveBeenCalledWith("/mailboxes", { domain_name: "example.be" });
  });

  it("encodes e-mail addresses in mail zone paths", async () => {
    client.delete.mockResolvedValue(ok(undefined, { status: 204 }));
    await call("combell_mail_zones_aliases_delete", { domain_name: "example.be", email_address: "sales@example.be" });
    expect(client.delete).toHaveBeenCalledWith("/mailzones/example.be/aliases/sales%40example.be");
  });

  it("auto-forward only sends the fields that were passed", async () => {
    client.put.mockResolvedValue(ok(undefined, { status: 204 }));
    await call("combell_mailboxes_set_auto_forward", { mailbox_name: "info@example.be", enabled: true, email_addresses: ["x@y.be"] });
    expect(client.put).toHaveBeenCalledWith("/mailboxes/info%40example.be/autoforward", { enabled: true, email_addresses: ["x@y.be"] });
  });
});

describe("ssl certificate requests", () => {
  it("get maps 303 to completed with the certificate fingerprint", async () => {
    client.get.mockResolvedValue(ok(undefined, { status: 303, location: "https://api.combell.com/v2/sslcertificates/ABCDEF" }));
    const out = await call("combell_ssl_certificate_requests_get", { id: 7 });
    expect(client.get).toHaveBeenCalledWith("/sslcertificaterequests/7", undefined, [303, 410]);
    expect(out.json()).toMatchObject({ status: "completed", certificate_sha1_fingerprint: "ABCDEF" });
  });
  it("get maps 410 to gone", async () => {
    client.get.mockResolvedValue(ok(undefined, { status: 410 }));
    expect((await call("combell_ssl_certificate_requests_get", { id: 7 })).json()).toMatchObject({ status: "gone" });
  });
  it("get passes through an ongoing request", async () => {
    client.get.mockResolvedValue(ok({ id: 7, validations: [{ dns_name: "example.be", type: "dns" }] }));
    expect((await call("combell_ssl_certificate_requests_get", { id: 7 })).json()).toMatchObject({ status: "ongoing", validations: [{ dns_name: "example.be" }] });
  });
});
