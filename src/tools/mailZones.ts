/**
 * Mail zones: the per-domain mail configuration (aliases, catch-all, anti-spam, SMTP domains).
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CombellClient } from "../api/client.js";
import { defineTool, DESTRUCTIVE, READ, UPDATE, WRITE } from "../lib/tool.js";
import { accepted, created, done } from "../lib/results.js";
import { p } from "../lib/path.js";
import type { MailZone } from "../types/index.js";

export function registerMailZoneTools(server: McpServer, client: CombellClient): void {
  defineTool(server, "combell_mail_zones_get", {
    description:
      "Get the mail zone of a domain: whether mail is enabled, the mail accounts (with the account_id needed to create mailboxes), " +
      "aliases, anti-spam level, catch-all and extra SMTP domains.",
    input: { domain_name: z.string().describe("The domain name, e.g. 'example.be'") },
    annotations: READ,
  }, async (a) => (await client.get<MailZone>(p`/mailzones/${a.domain_name}`)).data);

  defineTool(server, "combell_mail_zones_catch_all_create", {
    description: "Set a catch-all: e-mail sent to non-existent addresses on the domain is delivered to this address.",
    input: { domain_name: z.string(), email_address: z.string().email().describe("Destination for all unmatched e-mail") },
    annotations: WRITE,
  }, async (a) => created(await client.post(p`/mailzones/${a.domain_name}/catchall`, { email_address: a.email_address }), {
    domain_name: a.domain_name, email_address: a.email_address,
  }));

  defineTool(server, "combell_mail_zones_catch_all_delete", {
    description: "Remove a catch-all address from the mail zone.",
    input: { domain_name: z.string(), email_address: z.string().email().describe("The catch-all destination address to remove") },
    annotations: DESTRUCTIVE,
  }, async (a) => {
    await client.delete(p`/mailzones/${a.domain_name}/catchall/${a.email_address}`);
    return done("catch_all_deleted", { domain_name: a.domain_name, email_address: a.email_address });
  });

  defineTool(server, "combell_mail_zones_set_anti_spam", {
    description: "Set the anti-spam level of the mail zone (none, basic or advanced). Check allowed_types on the mail zone first.",
    input: { domain_name: z.string(), type: z.enum(["none", "basic", "advanced"]) },
    annotations: UPDATE,
  }, async (a) => {
    await client.put(p`/mailzones/${a.domain_name}/antispam`, { type: a.type });
    return done("anti_spam_updated", { domain_name: a.domain_name, type: a.type });
  });

  defineTool(server, "combell_mail_zones_aliases_create", {
    description: "Create an e-mail alias that forwards to one or more destination addresses.",
    input: {
      domain_name: z.string(),
      email_address: z.string().email().describe("The alias address, e.g. 'sales@example.be'"),
      destinations: z.array(z.string().email()).min(1).describe("Destination addresses"),
    },
    annotations: WRITE,
  }, async (a) => created(await client.post(p`/mailzones/${a.domain_name}/aliases`, {
    email_address: a.email_address, destinations: a.destinations,
  }), { domain_name: a.domain_name, email_address: a.email_address, destinations: a.destinations }));

  defineTool(server, "combell_mail_zones_aliases_update", {
    description: "Replace the destination addresses of an existing alias. The change is processed in the background (202 Accepted).",
    input: {
      domain_name: z.string(),
      email_address: z.string().email().describe("The alias address"),
      destinations: z.array(z.string().email()).min(1).describe("The full new list of destination addresses"),
    },
    annotations: UPDATE,
  }, async (a) => accepted(await client.put(p`/mailzones/${a.domain_name}/aliases/${a.email_address}`, { destinations: a.destinations }), {
    domain_name: a.domain_name, email_address: a.email_address, destinations: a.destinations,
  }));

  defineTool(server, "combell_mail_zones_aliases_delete", {
    description: "Delete an e-mail alias. SIDE EFFECT: mail to the alias will bounce.",
    input: { domain_name: z.string(), email_address: z.string().email().describe("The alias address to delete") },
    annotations: DESTRUCTIVE,
  }, async (a) => {
    await client.delete(p`/mailzones/${a.domain_name}/aliases/${a.email_address}`);
    return done("alias_deleted", { domain_name: a.domain_name, email_address: a.email_address });
  });

  defineTool(server, "combell_mail_zones_smtp_domains_create", {
    description: "Add an extra SMTP domain to the mail zone, so mail sent to that domain is caught by the matching addresses on the main domain.",
    input: { domain_name: z.string().describe("The main domain (mail zone)"), hostname: z.string().describe("The extra domain, e.g. 'example.com'") },
    annotations: WRITE,
  }, async (a) => created(await client.post(p`/mailzones/${a.domain_name}/smtpdomains`, { hostname: a.hostname }), {
    domain_name: a.domain_name, hostname: a.hostname,
  }));

  defineTool(server, "combell_mail_zones_smtp_domains_update", {
    description: "Enable or disable an extra SMTP domain on the mail zone. The change is processed in the background (202 Accepted).",
    input: { domain_name: z.string(), hostname: z.string(), enabled: z.boolean() },
    annotations: UPDATE,
  }, async (a) => accepted(await client.put(p`/mailzones/${a.domain_name}/smtpdomains/${a.hostname}`, { enabled: a.enabled }), {
    domain_name: a.domain_name, hostname: a.hostname, enabled: a.enabled,
  }));

  defineTool(server, "combell_mail_zones_smtp_domains_delete", {
    description: "Remove an extra SMTP domain from the mail zone.",
    input: { domain_name: z.string(), hostname: z.string() },
    annotations: DESTRUCTIVE,
  }, async (a) => {
    await client.delete(p`/mailzones/${a.domain_name}/smtpdomains/${a.hostname}`);
    return done("smtp_domain_deleted", { domain_name: a.domain_name, hostname: a.hostname });
  });
}
