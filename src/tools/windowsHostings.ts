/**
 * Windows hostings (read-only in the public API).
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CombellClient } from "../api/client.js";
import { defineTool, READ } from "../lib/tool.js";
import { pageFields, toList } from "../lib/paging.js";
import { p } from "../lib/path.js";
import type { WindowsHosting, WindowsHostingDetail } from "../types/index.js";

export function registerWindowsHostingTools(server: McpServer, client: CombellClient): void {
  defineTool(server, "combell_windows_hostings_list", {
    description: "List the Windows hosting accounts (by domain name) on your Combell account.",
    input: { ...pageFields },
    annotations: READ,
  }, async (a) => toList(await client.get<WindowsHosting[]>("/windowshostings", { skip: a.skip, take: a.take })));

  defineTool(server, "combell_windows_hostings_get", {
    description: "Get the details of a Windows hosting: webspace size and usage, IP, FTP username, application pool (.NET runtimes), sites with bindings and MSSQL database names.",
    input: { domain_name: z.string().describe("The Windows hosting domain name") },
    annotations: READ,
  }, async (a) => (await client.get<WindowsHostingDetail>(p`/windowshostings/${a.domain_name}`)).data);
}
