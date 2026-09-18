/**
 * Accounts and servicepacks
 *
 * An account is an instance of a servicepack (e.g. a hosting package) that groups
 * assets: a domain, a Linux hosting, mailboxes, databases, ...
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CombellClient } from "../api/client.js";
import { defineTool, READ, WRITE } from "../lib/tool.js";
import { pageFields, toList } from "../lib/paging.js";
import { accepted } from "../lib/results.js";
import { p } from "../lib/path.js";
import type { Account, AccountDetail, Servicepack } from "../types/index.js";

const ASSET_TYPES = ["domain", "linux_hosting", "mysql", "dns", "mailbox", "windows_hosting"] as const;

export function registerAccountTools(server: McpServer, client: CombellClient): void {
  defineTool(server, "combell_accounts_list", {
    description:
      "List Combell accounts (instances of a servicepack such as a hosting package). Filter by asset type or by identifier (usually the domain name).",
    input: {
      ...pageFields,
      asset_type: z.enum(ASSET_TYPES).optional().describe("Only accounts containing this asset type"),
      identifier: z.string().optional().describe("Only accounts matching this identifier (e.g. a domain name)"),
    },
    annotations: READ,
  }, async (a) => toList(await client.get<Account[]>("/accounts", {
    skip: a.skip, take: a.take, asset_type: a.asset_type, identifier: a.identifier,
  })));

  defineTool(server, "combell_accounts_get", {
    description: "Get a Combell account by id, including its servicepack and addons.",
    input: { account_id: z.number().int().describe("The account id") },
    annotations: READ,
  }, async (a) => (await client.get<AccountDetail>(p`/accounts/${a.account_id}`)).data);

  defineTool(server, "combell_accounts_create", {
    description:
      "Create a new account for a servicepack. SIDE EFFECT: this orders a product on your Combell reseller contract and may incur costs. " +
      "Provisioning runs in the background: the result contains a provisioning job id to poll with combell_provisioning_jobs_get.",
    input: {
      identifier: z.string().describe("Identifier for the account; a domain name for hosting accounts"),
      servicepack_id: z.number().int().describe("Servicepack id (see combell_servicepacks_list)"),
      ftp_password: z.string().optional().describe(
        "FTP password when the servicepack contains hosting: 8-20 characters, letters and digits, at least one digit and one letter, no spaces, none of * € $ & + } { ' \" \\"
      ),
    },
    annotations: WRITE,
  }, async (a) => accepted(await client.post("/accounts", {
    identifier: a.identifier,
    servicepack_id: a.servicepack_id,
    ...(a.ftp_password ? { ftp_password: a.ftp_password } : {}),
  })));

  defineTool(server, "combell_servicepacks_list", {
    description: "List the servicepacks (product packages) available on your Combell reseller contract, with their ids.",
    input: {},
    annotations: READ,
  }, async () => toList(await client.get<Servicepack[]>("/servicepacks")));
}
