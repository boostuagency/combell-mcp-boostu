/**
 * Mailboxes: list per domain, detail, create, delete, password, auto-reply and auto-forward.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CombellClient } from "../api/client.js";
import { defineTool, DESTRUCTIVE, READ, UPDATE, WRITE } from "../lib/tool.js";
import { toList } from "../lib/paging.js";
import { created, done } from "../lib/results.js";
import { p } from "../lib/path.js";
import type { Mailbox, MailboxDetail } from "../types/index.js";

export const PASSWORD_RULES =
  "8-20 characters, a mix of letters and digits with at least one of each, no spaces, none of * € $ & + } { ' \" \\";

export function registerMailboxTools(server: McpServer, client: CombellClient): void {
  defineTool(server, "combell_mailboxes_list", {
    description: "List the mailboxes of a domain with their maximum and used size (MB).",
    input: { domain_name: z.string().describe("The domain name whose mailboxes to list (required)") },
    annotations: READ,
  }, async (a) => toList(await client.get<Mailbox[]>("/mailboxes", { domain_name: a.domain_name })));

  defineTool(server, "combell_mailboxes_get", {
    description: "Get a mailbox: login, sizes, auto-reply and auto-forward settings.",
    input: { mailbox_name: z.string().describe("The mailbox e-mail address, e.g. 'info@example.be'") },
    annotations: READ,
  }, async (a) => (await client.get<MailboxDetail>(p`/mailboxes/${a.mailbox_name}`)).data);

  defineTool(server, "combell_mailboxes_create", {
    description:
      "Create a mailbox on a mail zone account. Find the account_id in the mail zone's available_accounts (combell_mail_zones_get).",
    input: {
      email_address: z.string().email().describe("The new mailbox address, e.g. 'info@example.be'"),
      account_id: z.number().int().describe("Mail zone account id (from combell_mail_zones_get available_accounts)"),
      password: z.string().describe(`Mailbox password: ${PASSWORD_RULES}`),
    },
    annotations: WRITE,
  }, async (a) => created(await client.post("/mailboxes", {
    email_address: a.email_address, account_id: a.account_id, password: a.password,
  }), { email_address: a.email_address }));

  defineTool(server, "combell_mailboxes_delete", {
    description: "Delete a mailbox and all its e-mail. SIDE EFFECT: irreversible.",
    input: { mailbox_name: z.string().describe("The mailbox e-mail address to delete") },
    annotations: DESTRUCTIVE,
  }, async (a) => {
    await client.delete(p`/mailboxes/${a.mailbox_name}`);
    return done("mailbox_deleted", { mailbox_name: a.mailbox_name });
  });

  defineTool(server, "combell_mailboxes_set_password", {
    description: "Change the password of a mailbox.",
    input: { mailbox_name: z.string(), password: z.string().describe(`New password: ${PASSWORD_RULES}`) },
    annotations: UPDATE,
  }, async (a) => {
    await client.put(p`/mailboxes/${a.mailbox_name}/password`, { password: a.password });
    return done("mailbox_password_updated", { mailbox_name: a.mailbox_name });
  });

  defineTool(server, "combell_mailboxes_set_auto_reply", {
    description: "Configure the auto-reply (out of office) of a mailbox.",
    input: {
      mailbox_name: z.string(),
      enabled: z.boolean(),
      subject: z.string().optional().describe("Subject of the automatic reply"),
      message: z.string().optional().describe("Body of the automatic reply"),
    },
    annotations: UPDATE,
  }, async (a) => {
    const body = { enabled: a.enabled, ...(a.subject !== undefined ? { subject: a.subject } : {}), ...(a.message !== undefined ? { message: a.message } : {}) };
    await client.put(p`/mailboxes/${a.mailbox_name}/autoreply`, body);
    return done("auto_reply_updated", { mailbox_name: a.mailbox_name, ...body });
  });

  defineTool(server, "combell_mailboxes_set_auto_forward", {
    description: "Configure automatic forwarding of a mailbox to one or more addresses, optionally keeping a copy in the mailbox.",
    input: {
      mailbox_name: z.string(),
      enabled: z.boolean(),
      email_addresses: z.array(z.string().email()).optional().describe("Destination addresses"),
      copy_to_myself: z.boolean().optional().describe("Keep a copy in the mailbox"),
    },
    annotations: UPDATE,
  }, async (a) => {
    const body = {
      enabled: a.enabled,
      ...(a.email_addresses !== undefined ? { email_addresses: a.email_addresses } : {}),
      ...(a.copy_to_myself !== undefined ? { copy_to_myself: a.copy_to_myself } : {}),
    };
    await client.put(p`/mailboxes/${a.mailbox_name}/autoforward`, body);
    return done("auto_forward_updated", { mailbox_name: a.mailbox_name, ...body });
  });
}
