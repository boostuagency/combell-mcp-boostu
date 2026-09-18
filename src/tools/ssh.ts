/**
 * SSH: access toggle and public keys per Linux hosting, plus the account-wide key overview.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CombellClient } from "../api/client.js";
import { defineTool, DESTRUCTIVE, READ, UPDATE, WRITE } from "../lib/tool.js";
import { pageFields, toList } from "../lib/paging.js";
import { created, done } from "../lib/results.js";
import { p } from "../lib/path.js";
import type { SshKey, SshKeyDetail } from "../types/index.js";

export function registerSshTools(server: McpServer, client: CombellClient): void {
  defineTool(server, "combell_ssh_keys_list_all", {
    description: "List every SSH public key on your Combell account, with the Linux hostings each key is attached to.",
    input: { ...pageFields },
    annotations: READ,
  }, async (a) => toList(await client.get<SshKeyDetail[]>("/ssh", { skip: a.skip, take: a.take })));

  defineTool(server, "combell_ssh_set_enabled", {
    description: "Enable or disable SSH access on a Linux hosting.",
    input: { domain_name: z.string().describe("The Linux hosting domain name"), enabled: z.boolean() },
    annotations: UPDATE,
  }, async (a) => {
    await client.put(p`/linuxhostings/${a.domain_name}/ssh/configuration`, { enabled: a.enabled });
    return done("ssh_updated", { domain_name: a.domain_name, enabled: a.enabled });
  });

  defineTool(server, "combell_ssh_keys_list", {
    description: "List the SSH public keys attached to a Linux hosting.",
    input: { domain_name: z.string().describe("The Linux hosting domain name") },
    annotations: READ,
  }, async (a) => toList(await client.get<SshKey[]>(p`/linuxhostings/${a.domain_name}/ssh/keys`)));

  defineTool(server, "combell_ssh_keys_add", {
    description: "Attach an SSH public key to a Linux hosting so it can be used to log in over SSH/SFTP.",
    input: {
      domain_name: z.string().describe("The Linux hosting domain name"),
      public_key: z.string().describe("The public key in OpenSSH format, e.g. 'ssh-ed25519 AAAA... user@host'"),
    },
    annotations: WRITE,
  }, async (a) => created(await client.post(p`/linuxhostings/${a.domain_name}/ssh/keys`, { public_key: a.public_key }), { domain_name: a.domain_name }));

  defineTool(server, "combell_ssh_keys_delete", {
    description: "Remove an SSH public key (by fingerprint) from a Linux hosting. SIDE EFFECT: that key can no longer log in.",
    input: { domain_name: z.string(), fingerprint: z.string().describe("Fingerprint of the public key (see combell_ssh_keys_list)") },
    annotations: DESTRUCTIVE,
  }, async (a) => {
    await client.delete(p`/linuxhostings/${a.domain_name}/ssh/keys/${a.fingerprint}`);
    return done("ssh_key_deleted", { domain_name: a.domain_name, fingerprint: a.fingerprint });
  });
}
