/**
 * DNS records for domains hosted on Combell name servers.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CombellClient } from "../api/client.js";
import { defineTool, DESTRUCTIVE, READ, UPDATE, WRITE } from "../lib/tool.js";
import { pageFields, toList } from "../lib/paging.js";
import { created, done } from "../lib/results.js";
import { p } from "../lib/path.js";
import type { DnsRecord } from "../types/index.js";

const RECORD_TYPES = ["A", "AAAA", "CAA", "CNAME", "MX", "TXT", "SRV", "ALIAS", "TLSA"] as const;

const recordFields = {
  record_name: z.string().optional().describe(
    "Host name / alias the record defines. Empty or '@' means the domain itself; 'www' means www.<domain>. Not used for SRV records; for TLSA use e.g. '_25._tcp'."
  ),
  ttl: z.number().int().min(60).max(86400).optional().describe("Time to live in seconds, 60-86400 (default 3600)"),
  content: z.string().optional().describe(
    "Record data: A = IPv4, AAAA = IPv6, CNAME/ALIAS = canonical name, MX = mail host FQDN, TXT = free text, " +
    "CAA = '{flag} {tag} {ca}' (e.g. '0 issue letsencrypt.org'), TLSA = '{usage} {selector} {matching_type} {data}'. Not used for SRV."
  ),
  priority: z.number().int().min(0).max(9999).optional().describe("Priority for MX or SRV records (lower is more preferred)"),
  service: z.string().optional().describe("SRV only: symbolic service name, e.g. '_sip'"),
  protocol: z.string().optional().describe("SRV only: protocol, e.g. 'TCP' or 'UDP'"),
  weight: z.number().int().min(0).optional().describe("SRV only: weight among records with the same priority (higher is more preferred)"),
  port: z.number().int().min(1).optional().describe("SRV only: port of the service"),
  target: z.string().optional().describe("SRV only: canonical host name providing the service"),
};

/** Copy only the defined record fields into an API payload. */
export function toRecordBody(args: Partial<DnsRecord> & { type?: string }): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  const keys = ["id", "type", "record_name", "ttl", "content", "priority", "service", "protocol", "weight", "port", "target"] as const;
  for (const k of keys) if (args[k] !== undefined) body[k] = args[k];
  return body;
}

export function registerDnsTools(server: McpServer, client: CombellClient): void {
  defineTool(server, "combell_dns_records_list", {
    description:
      "List the DNS records of a domain. Filter by type (A, AAAA, CAA, CNAME, MX, TXT, SRV, ALIAS, TLSA); " +
      "record_name and service filters only apply together with a type filter.",
    input: {
      domain_name: z.string().describe("The domain name, e.g. 'example.be'"),
      ...pageFields,
      type: z.enum(RECORD_TYPES).optional().describe("Only records of this type"),
      record_name: z.string().optional().describe("Only records with this name (requires type)"),
      service: z.string().optional().describe("Only SRV records for this service (requires type=SRV)"),
    },
    annotations: READ,
  }, async (a) => toList(await client.get<DnsRecord[]>(p`/dns/${a.domain_name}/records`, {
    skip: a.skip, take: a.take, type: a.type, record_name: a.record_name, service: a.service,
  })));

  defineTool(server, "combell_dns_records_get", {
    description: "Get a single DNS record of a domain by record id.",
    input: { domain_name: z.string(), record_id: z.string().describe("The record id (see combell_dns_records_list)") },
    annotations: READ,
  }, async (a) => (await client.get<DnsRecord>(p`/dns/${a.domain_name}/records/${a.record_id}`)).data);

  defineTool(server, "combell_dns_records_create", {
    description:
      "Create a DNS record on a domain. For A/AAAA/CNAME/MX/TXT/CAA/ALIAS/TLSA pass record_name + content (+ priority for MX); " +
      "for SRV pass service, protocol, priority, weight, port and target. SIDE EFFECT: changes live DNS.",
    input: {
      domain_name: z.string(),
      type: z.enum(RECORD_TYPES).describe("Record type"),
      ...recordFields,
    },
    annotations: WRITE,
  }, async (a) => {
    const { domain_name, ...rest } = a;
    const res = await client.post(p`/dns/${domain_name}/records`, toRecordBody(rest));
    return created(res, { domain_name, record: toRecordBody(rest) });
  });

  defineTool(server, "combell_dns_records_update", {
    description:
      "Update an existing DNS record. The current record is read first and only the fields you pass are changed, " +
      "then the full record is written back. SRV service/protocol/port/target cannot be edited: delete and recreate instead. SIDE EFFECT: changes live DNS.",
    input: {
      domain_name: z.string(),
      record_id: z.string().describe("The record id to update"),
      ...recordFields,
    },
    annotations: UPDATE,
  }, async (a) => {
    const { domain_name, record_id, ...changes } = a;
    const current = (await client.get<DnsRecord>(p`/dns/${domain_name}/records/${record_id}`)).data ?? { type: "" };
    const merged = { ...toRecordBody(current), ...toRecordBody(changes), id: record_id };
    await client.put(p`/dns/${domain_name}/records/${record_id}`, merged);
    return done("record_updated", { domain_name, record: merged });
  });

  defineTool(server, "combell_dns_records_delete", {
    description: "Delete a DNS record from a domain. SIDE EFFECT: irreversible and changes live DNS.",
    input: { domain_name: z.string(), record_id: z.string().describe("The record id to delete") },
    annotations: DESTRUCTIVE,
  }, async (a) => {
    await client.delete(p`/dns/${a.domain_name}/records/${a.record_id}`);
    return done("record_deleted", { domain_name: a.domain_name, record_id: a.record_id });
  });
}
