import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CombellClient } from "./api/client.js";
import { enabledGroups, isGroupEnabled } from "./lib/toolFilter.js";

import { registerAccountTools } from "./tools/accounts.js";
import { registerProvisioningTools } from "./tools/provisioning.js";
import { registerDomainTools } from "./tools/domains.js";
import { registerDnsTools } from "./tools/dns.js";
import { registerLinuxHostingTools } from "./tools/linuxHostings.js";
import { registerScheduledTaskTools } from "./tools/scheduledTasks.js";
import { registerSshTools } from "./tools/ssh.js";
import { registerWindowsHostingTools } from "./tools/windowsHostings.js";
import { registerMailboxTools } from "./tools/mailboxes.js";
import { registerMailZoneTools } from "./tools/mailZones.js";
import { registerMysqlTools } from "./tools/mysql.js";
import { registerSslTools } from "./tools/ssl.js";

type Register = (server: McpServer, client: CombellClient) => void;

// Group name → registrar. Keys double as the COMBELL_TOOLS filter values.
export const GROUPS: Record<string, Register> = {
  accounts: registerAccountTools,
  provisioning: registerProvisioningTools,
  domains: registerDomainTools,
  dns: registerDnsTools,
  linuxHostings: registerLinuxHostingTools,
  scheduledTasks: registerScheduledTaskTools,
  ssh: registerSshTools,
  windowsHostings: registerWindowsHostingTools,
  mailboxes: registerMailboxTools,
  mailZones: registerMailZoneTools,
  mysql: registerMysqlTools,
  ssl: registerSslTools,
};

export const SERVER_VERSION = "1.0.0";

export function createServer(client: CombellClient): McpServer {
  const server = new McpServer({
    name: "combell", // client-facing id; keep stable for existing configs
    version: SERVER_VERSION,
    description:
      "BoostU MCP server for the Combell hosting API: domains, DNS, Linux and Windows hosting, mailboxes, mail zones, MySQL databases, SSH keys and SSL certificates.",
  });

  const enabled = enabledGroups();
  for (const [group, register] of Object.entries(GROUPS)) {
    if (isGroupEnabled(group, enabled)) register(server, client);
  }
  return server;
}
