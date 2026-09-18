/**
 * Domains: overview, detail, registration, transfer, name servers and renewal.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CombellClient } from "../api/client.js";
import { defineTool, READ, UPDATE, WRITE } from "../lib/tool.js";
import { pageFields, toList } from "../lib/paging.js";
import { accepted, done } from "../lib/results.js";
import { p } from "../lib/path.js";
import type { Domain, DomainDetail, RegistrantInput } from "../types/index.js";

export const registrantShape = z.object({
  first_name: z.string().describe("First name of the registrant"),
  last_name: z.string().describe("Last name of the registrant"),
  address: z.string().describe("Street and number"),
  postal_code: z.string(),
  city: z.string(),
  country_code: z.string().describe("ISO 3166-1 alpha-2, e.g. 'BE', 'NL', 'FR'"),
  email: z.string().email(),
  phone: z.string().describe("Format '+32.123456789'"),
  fax: z.string().optional().describe("Format '+32.123456789'"),
  language_code: z.string().optional().describe("'nl', 'fr', 'en', 'de', ..."),
  company_name: z.string().optional().describe("Set when the registrant is a company; leave empty for an individual"),
  enterprise_number: z.string().optional().describe("Company enterprise/VAT number, e.g. 'BE0123456789'"),
  extra_fields: z.array(z.object({ name: z.string(), value: z.string() })).optional().describe(
    "TLD-specific registrant fields, e.g. CompanyNumber (.dk/.es/.fr/.nu/.se companies), PassportNumber (.es/.nu/.se/.it individuals), CodiceFiscal (.it Italian individuals)"
  ),
});

function cleanRegistrant(r: z.infer<typeof registrantShape>): RegistrantInput {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(r)) if (v !== undefined) out[k] = v;
  return out as RegistrantInput;
}

export function registerDomainTools(server: McpServer, client: CombellClient): void {
  defineTool(server, "combell_domains_list", {
    description: "List the domain names on your Combell account with their expiration date and renewal state.",
    input: { ...pageFields },
    annotations: READ,
  }, async (a) => toList(await client.get<Domain[]>("/domains", { skip: a.skip, take: a.take })));

  defineTool(server, "combell_domains_get", {
    description: "Get the details of a domain name: expiration, renewal state, name servers, registrant and whether renewal can be toggled.",
    input: { domain_name: z.string().describe("The domain name, e.g. 'example.be'") },
    annotations: READ,
  }, async (a) => (await client.get<DomainDetail>(p`/domains/${a.domain_name}`)).data);

  defineTool(server, "combell_domains_register", {
    description:
      "Register an available domain name. SIDE EFFECT: this purchases a domain name and incurs costs. " +
      "Registration runs in the background (202 Accepted); check the returned provisioning job. " +
      "'.ca' domains are only available for registrants with country code 'CA'.",
    input: {
      domain_name: z.string().describe("Domain part and TLD only, e.g. 'example.be'"),
      name_servers: z.array(z.string()).optional().describe("Name servers; leave empty to use Combell's default name servers"),
      registrant: registrantShape,
    },
    annotations: WRITE,
  }, async (a) => accepted(await client.post("/domains/registrations", {
    domain_name: a.domain_name,
    ...(a.name_servers?.length ? { name_servers: a.name_servers } : {}),
    registrant: cleanRegistrant(a.registrant),
  })));

  defineTool(server, "combell_domains_transfer", {
    description:
      "Transfer a domain name to Combell using its transfer authorization (EPP) code. SIDE EFFECT: this purchases a transfer and incurs costs. " +
      "The transfer runs in the background (202 Accepted); check the returned provisioning job.",
    input: {
      domain_name: z.string().describe("Domain part and TLD only, e.g. 'example.be'"),
      auth_code: z.string().describe("Transfer authorization code from the current registrar"),
      name_servers: z.array(z.string()).optional().describe("Name servers; leave empty to use Combell's default name servers"),
      registrant: registrantShape,
    },
    annotations: WRITE,
  }, async (a) => accepted(await client.post("/domains/transfers", {
    domain_name: a.domain_name,
    auth_code: a.auth_code,
    ...(a.name_servers?.length ? { name_servers: a.name_servers } : {}),
    registrant: cleanRegistrant(a.registrant),
  })));

  defineTool(server, "combell_domains_set_nameservers", {
    description: "Replace the name servers of a domain name. SIDE EFFECT: DNS for the domain will resolve from the new name servers once propagated.",
    input: {
      domain_name: z.string(),
      name_servers: z.array(z.string()).min(1).describe("Full list of name server host names, e.g. ['ns1.example.net', 'ns2.example.net']"),
    },
    annotations: UPDATE,
  }, async (a) => {
    await client.put(p`/domains/${a.domain_name}/nameservers`, { domain_name: a.domain_name, name_servers: a.name_servers });
    return done("nameservers_updated", { domain_name: a.domain_name, name_servers: a.name_servers });
  });

  defineTool(server, "combell_domains_set_renew", {
    description:
      "Enable or disable automatic renewal of a domain name. Only allowed when can_toggle_renew is true on the domain detail " +
      "(no unpaid invoices and the renewal does not start within a month) and the API user has the finance role. " +
      "SIDE EFFECT: disabling renewal lets the domain expire.",
    input: { domain_name: z.string(), will_renew: z.boolean().describe("true to renew automatically, false to let it expire") },
    annotations: UPDATE,
  }, async (a) => {
    await client.put(p`/domains/${a.domain_name}/renew`, { will_renew: a.will_renew });
    return done("renew_updated", { domain_name: a.domain_name, will_renew: a.will_renew });
  });
}
