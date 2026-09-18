/**
 * Scheduled tasks (cron jobs) on Linux hostings.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CombellClient } from "../api/client.js";
import { defineTool, DESTRUCTIVE, READ, UPDATE, WRITE } from "../lib/tool.js";
import { toList } from "../lib/paging.js";
import { created, done } from "../lib/results.js";
import { p } from "../lib/path.js";
import type { ScheduledTask } from "../types/index.js";

const CRON_HELP =
  "5-field cron expression: minute (0-59 or */5, */10, */15, */30), hour (0-23 or *), day of month (1-31 or *), month (1-12 or *), day of week (1-7 = Monday-Sunday, or *). Example: '*/15 * * * *'";

export function registerScheduledTaskTools(server: McpServer, client: CombellClient): void {
  defineTool(server, "combell_scheduled_tasks_list", {
    description: "List the scheduled tasks (cron jobs) of a Linux hosting.",
    input: { domain_name: z.string().describe("The Linux hosting domain name") },
    annotations: READ,
  }, async (a) => toList(await client.get<ScheduledTask[]>(p`/linuxhostings/${a.domain_name}/scheduledtasks`)));

  defineTool(server, "combell_scheduled_tasks_get", {
    description: "Get a scheduled task of a Linux hosting by id.",
    input: { domain_name: z.string(), scheduled_task_id: z.string() },
    annotations: READ,
  }, async (a) => (await client.get<ScheduledTask>(p`/linuxhostings/${a.domain_name}/scheduledtasks/${a.scheduled_task_id}`)).data);

  defineTool(server, "combell_scheduled_tasks_create", {
    description: "Add a scheduled task (cron job) to a Linux hosting that runs a script on the hosting.",
    input: {
      domain_name: z.string(),
      cron_expression: z.string().describe(CRON_HELP),
      script_location: z.string().describe("Absolute path on the hosting of the script to execute, e.g. '/www/cron.php'"),
      enabled: z.boolean().optional().describe("Default true"),
    },
    annotations: WRITE,
  }, async (a) => {
    const task = { enabled: a.enabled ?? true, cron_expression: a.cron_expression, script_location: a.script_location };
    return created(await client.post(p`/linuxhostings/${a.domain_name}/scheduledtasks`, task), { domain_name: a.domain_name, task });
  });

  defineTool(server, "combell_scheduled_tasks_update", {
    description: "Update a scheduled task. The current task is read first and only the fields you pass are changed.",
    input: {
      domain_name: z.string(),
      scheduled_task_id: z.string(),
      cron_expression: z.string().optional().describe(CRON_HELP),
      script_location: z.string().optional().describe("Absolute path on the hosting of the script to execute"),
      enabled: z.boolean().optional(),
    },
    annotations: UPDATE,
  }, async (a) => {
    const path = p`/linuxhostings/${a.domain_name}/scheduledtasks/${a.scheduled_task_id}`;
    const current = (await client.get<ScheduledTask>(path)).data;
    if (!current) throw new Error(`Scheduled task ${a.scheduled_task_id} not found on ${a.domain_name}`);
    const merged: ScheduledTask = {
      id: a.scheduled_task_id,
      enabled: a.enabled ?? current.enabled,
      cron_expression: a.cron_expression ?? current.cron_expression,
      script_location: a.script_location ?? current.script_location,
    };
    await client.put(path, merged);
    return done("scheduled_task_updated", { domain_name: a.domain_name, task: merged });
  });

  defineTool(server, "combell_scheduled_tasks_delete", {
    description: "Delete a scheduled task from a Linux hosting. SIDE EFFECT: irreversible.",
    input: { domain_name: z.string(), scheduled_task_id: z.string() },
    annotations: DESTRUCTIVE,
  }, async (a) => {
    await client.delete(p`/linuxhostings/${a.domain_name}/scheduledtasks/${a.scheduled_task_id}`);
    return done("scheduled_task_deleted", { domain_name: a.domain_name, scheduled_task_id: a.scheduled_task_id });
  });
}
