/**
 * Provisioning jobs
 *
 * Account, database and domain operations answer 202 Accepted with a Location header
 * pointing at a job. Poll it until it reports finished (201 with resource links).
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CombellClient } from "../api/client.js";
import { defineTool, READ } from "../lib/tool.js";
import { p } from "../lib/path.js";
import type { ProvisioningJobCompletion, ProvisioningJobInfo } from "../types/index.js";

export function registerProvisioningTools(server: McpServer, client: CombellClient): void {
  defineTool(server, "combell_provisioning_jobs_get", {
    description:
      "Get the status of a provisioning job (returned by account, MySQL database/user and domain operations). " +
      "While the job is ongoing the response has status 'ongoing' with an estimated completion time; once finished it has status 'finished' " +
      "and resource_links to the created resources. Do not retry the original operation until the job reports finished or cancelled; " +
      "contact Combell support on 'failed'.",
    input: { job_id: z.string().describe("The provisioning job id (from the Location header / provisioning_job_id)") },
    annotations: READ,
  }, async (a) => {
    const res = await client.get<ProvisioningJobInfo | ProvisioningJobCompletion>(p`/provisioningjobs/${a.job_id}`);
    if (res.status === 201) {
      const data = res.data as ProvisioningJobCompletion | undefined;
      return { id: data?.id ?? a.job_id, status: "finished", resource_links: data?.resource_links ?? [], location: res.location };
    }
    return res.data;
  });
}
