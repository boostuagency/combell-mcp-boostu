import { describe, it, expect, vi } from "vitest";

const registered: { name: string; annotations?: Record<string, unknown> }[] = [];
vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => {
  return {
    McpServer: class {
      constructor(_opts: unknown) {}
      registerTool(name: string, config: { annotations?: Record<string, unknown> }) {
        registered.push({ name, annotations: config.annotations });
      }
    },
  };
});

describe("createServer", () => {
  it("registers every tool group by default", async () => {
    const { createServer } = await import("../src/server.js");
    registered.length = 0;
    createServer({} as never);
    const names = registered.map((r) => r.name);
    for (const expected of [
      "combell_accounts_list", "combell_accounts_get", "combell_accounts_create", "combell_servicepacks_list",
      "combell_provisioning_jobs_get",
      "combell_domains_list", "combell_domains_get", "combell_domains_register", "combell_domains_transfer",
      "combell_domains_set_nameservers", "combell_domains_set_renew",
      "combell_dns_records_list", "combell_dns_records_get", "combell_dns_records_create", "combell_dns_records_update", "combell_dns_records_delete",
      "combell_linux_hostings_list", "combell_linux_hostings_get", "combell_linux_hostings_php_versions", "combell_linux_hostings_set_php_version",
      "combell_linux_hostings_set_php_memory_limit", "combell_linux_hostings_set_php_apcu", "combell_linux_hostings_set_gzip", "combell_linux_hostings_set_ftp",
      "combell_linux_hostings_subsites_create", "combell_linux_hostings_subsites_delete", "combell_linux_hostings_host_headers_create",
      "combell_linux_hostings_set_http2", "combell_linux_hostings_set_letsencrypt", "combell_linux_hostings_set_https_redirect",
      "combell_scheduled_tasks_list", "combell_scheduled_tasks_get", "combell_scheduled_tasks_create", "combell_scheduled_tasks_update", "combell_scheduled_tasks_delete",
      "combell_ssh_keys_list_all", "combell_ssh_set_enabled", "combell_ssh_keys_list", "combell_ssh_keys_add", "combell_ssh_keys_delete",
      "combell_windows_hostings_list", "combell_windows_hostings_get",
      "combell_mailboxes_list", "combell_mailboxes_get", "combell_mailboxes_create", "combell_mailboxes_delete",
      "combell_mailboxes_set_password", "combell_mailboxes_set_auto_reply", "combell_mailboxes_set_auto_forward",
      "combell_mail_zones_get", "combell_mail_zones_catch_all_create", "combell_mail_zones_catch_all_delete", "combell_mail_zones_set_anti_spam",
      "combell_mail_zones_aliases_create", "combell_mail_zones_aliases_update", "combell_mail_zones_aliases_delete",
      "combell_mail_zones_smtp_domains_create", "combell_mail_zones_smtp_domains_update", "combell_mail_zones_smtp_domains_delete",
      "combell_mysql_databases_list", "combell_mysql_databases_get", "combell_mysql_databases_create", "combell_mysql_databases_delete",
      "combell_mysql_users_list", "combell_mysql_users_create", "combell_mysql_users_set_status", "combell_mysql_users_set_password", "combell_mysql_users_delete",
      "combell_ssl_certificates_list", "combell_ssl_certificates_get", "combell_ssl_certificate_requests_list", "combell_ssl_certificate_requests_get",
      "combell_ssl_certificate_requests_create", "combell_ssl_certificate_requests_verify",
    ]) {
      expect(names).toContain(expected);
    }
    expect(new Set(names).size).toBe(names.length); // no duplicate names
    expect(names.every((n) => /^combell_[a-z0-9_]+$/.test(n))).toBe(true);
  });

  it("marks read tools read-only and delete tools destructive", async () => {
    const { createServer } = await import("../src/server.js");
    registered.length = 0;
    createServer({} as never);
    const byName = Object.fromEntries(registered.map((r) => [r.name, r.annotations ?? {}]));
    expect(byName["combell_domains_list"]).toMatchObject({ readOnlyHint: true });
    expect(byName["combell_dns_records_delete"]).toMatchObject({ destructiveHint: true, readOnlyHint: false });
    expect(byName["combell_mailboxes_delete"]).toMatchObject({ destructiveHint: true });
    expect(byName["combell_dns_records_create"]).toMatchObject({ readOnlyHint: false });
  });

  it("honours COMBELL_TOOLS to restrict groups", async () => {
    const { createServer } = await import("../src/server.js");
    registered.length = 0;
    process.env.COMBELL_TOOLS = "dns, domains";
    createServer({} as never);
    delete process.env.COMBELL_TOOLS;
    const names = registered.map((r) => r.name);
    expect(names).toContain("combell_dns_records_list");
    expect(names).toContain("combell_domains_list");
    expect(names).not.toContain("combell_mailboxes_list");
    expect(names).not.toContain("combell_accounts_list");
  });
});
