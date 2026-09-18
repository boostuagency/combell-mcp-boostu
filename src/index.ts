#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CombellAuth } from "./api/auth.js";
import { CombellClient } from "./api/client.js";
import { createServer } from "./server.js";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    // Do not throw: the server must still start and answer introspection
    // (initialize / tools/list) without credentials, so MCP clients and
    // directories can discover the tools. Tool calls fail with a clear auth
    // error until the variable is set.
    console.error(`[combell-mcp] ${name} is not set. Configure it before calling tools.`);
  }
  return value ?? "";
}

async function main(): Promise<void> {
  const auth = new CombellAuth({
    apiKey: getEnv("COMBELL_API_KEY"),
    apiSecret: getEnv("COMBELL_API_SECRET"),
  });
  const client = new CombellClient(auth);
  const server = createServer(client);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.on("SIGINT", async () => { await server.close(); process.exit(0); });
  process.on("SIGTERM", async () => { await server.close(); process.exit(0); });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
