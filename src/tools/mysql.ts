/**
 * MySQL databases and database users.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CombellClient } from "../api/client.js";
import { defineTool, DESTRUCTIVE, READ, UPDATE, WRITE } from "../lib/tool.js";
import { pageFields, toList } from "../lib/paging.js";
import { accepted, done } from "../lib/results.js";
import { p } from "../lib/path.js";
import { PASSWORD_RULES } from "./mailboxes.js";
import type { MySqlDatabase, MySqlUser } from "../types/index.js";

export function registerMysqlTools(server: McpServer, client: CombellClient): void {
  defineTool(server, "combell_mysql_databases_list", {
    description: "List the MySQL databases on your Combell account with hostname, sizes, user count and account id.",
    input: { ...pageFields },
    annotations: READ,
  }, async (a) => toList(await client.get<MySqlDatabase[]>("/mysqldatabases", { skip: a.skip, take: a.take })));

  defineTool(server, "combell_mysql_databases_get", {
    description: "Get a MySQL database by its (provisioned) name.",
    input: { database_name: z.string().describe("The provisioned database name, e.g. 'ID123456_shop'") },
    annotations: READ,
  }, async (a) => (await client.get<MySqlDatabase>(p`/mysqldatabases/${a.database_name}`)).data);

  defineTool(server, "combell_mysql_databases_create", {
    description:
      "Create a MySQL database on an account (with a first read/write user). The name you pass is prefixed during provisioning, " +
      "so the final database name differs. Runs in the background: poll the returned provisioning job for the resource link.",
    input: {
      database_name: z.string().describe("Desired name; Combell prefixes it (e.g. 'shop' becomes 'ID123456_shop')"),
      account_id: z.number().int().describe("Account to create the database on (see combell_accounts_list)"),
      password: z.string().describe(`Password for the database user: ${PASSWORD_RULES}`),
    },
    annotations: WRITE,
  }, async (a) => accepted(await client.post("/mysqldatabases", {
    database_name: a.database_name, account_id: a.account_id, password: a.password,
  })));

  defineTool(server, "combell_mysql_databases_delete", {
    description: "Delete a MySQL database and all its data. SIDE EFFECT: irreversible.",
    input: { database_name: z.string().describe("The provisioned database name") },
    annotations: DESTRUCTIVE,
  }, async (a) => {
    await client.delete(p`/mysqldatabases/${a.database_name}`);
    return done("database_deleted", { database_name: a.database_name });
  });

  defineTool(server, "combell_mysql_users_list", {
    description: "List the users of a MySQL database with their rights (read_and_write or read_only) and status.",
    input: { database_name: z.string() },
    annotations: READ,
  }, async (a) => toList(await client.get<MySqlUser[]>(p`/mysqldatabases/${a.database_name}/users`)));

  defineTool(server, "combell_mysql_users_create", {
    description: "Add a user to a MySQL database. New users get read_only rights. Runs in the background (202 Accepted).",
    input: {
      database_name: z.string(),
      name: z.string().describe("User name: 2-14 lowercase letters and/or digits, no spaces"),
      password: z.string().describe(`Password: ${PASSWORD_RULES}`),
    },
    annotations: WRITE,
  }, async (a) => accepted(await client.post(p`/mysqldatabases/${a.database_name}/users`, { name: a.name, password: a.password }), {
    database_name: a.database_name, name: a.name,
  }));

  defineTool(server, "combell_mysql_users_set_status", {
    description: "Enable or disable a MySQL database user.",
    input: { database_name: z.string(), user_name: z.string(), enabled: z.boolean() },
    annotations: UPDATE,
  }, async (a) => {
    await client.put(p`/mysqldatabases/${a.database_name}/users/${a.user_name}/status`, { enabled: a.enabled });
    return done("database_user_status_updated", { database_name: a.database_name, user_name: a.user_name, enabled: a.enabled });
  });

  defineTool(server, "combell_mysql_users_set_password", {
    description: "Change the password of a MySQL database user.",
    input: { database_name: z.string(), user_name: z.string(), password: z.string().describe(`New password: ${PASSWORD_RULES}`) },
    annotations: UPDATE,
  }, async (a) => {
    await client.put(p`/mysqldatabases/${a.database_name}/users/${a.user_name}/password`, { password: a.password });
    return done("database_user_password_updated", { database_name: a.database_name, user_name: a.user_name });
  });

  defineTool(server, "combell_mysql_users_delete", {
    description: "Delete a MySQL database user. Only users with read_only rights can be deleted. SIDE EFFECT: irreversible.",
    input: { database_name: z.string(), user_name: z.string() },
    annotations: DESTRUCTIVE,
  }, async (a) => {
    await client.delete(p`/mysqldatabases/${a.database_name}/users/${a.user_name}`);
    return done("database_user_deleted", { database_name: a.database_name, user_name: a.user_name });
  });
}
