/**
 * SSL certificates and certificate requests (paid Sectigo certificates).
 *
 * Requesting a certificate purchases a paying product. The request resource lives until
 * the certificate is issued: GET then answers 303 with the certificate's Location, or 410
 * when the request was cancelled without a certificate.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CombellClient } from "../api/client.js";
import { defineTool, READ, WRITE } from "../lib/tool.js";
import { pageFields, toList } from "../lib/paging.js";
import { accepted, created, idFromLocation } from "../lib/results.js";
import { p } from "../lib/path.js";
import type { SslCertificate, SslCertificateDetail, SslCertificateRequest, SslCertificateRequestDetail } from "../types/index.js";

const CERT_TYPES = ["standard", "multi_domain", "wildcard"] as const;
const VALIDATION_LEVELS = ["domain_validated", "organization_validated", "extended_validated"] as const;

export function registerSslTools(server: McpServer, client: CombellClient): void {
  defineTool(server, "combell_ssl_certificates_list", {
    description: "List the (paid) SSL certificates on your Combell account with common name, expiry, type and validation level. Let's Encrypt certificates are managed per hosting instead.",
    input: { ...pageFields },
    annotations: READ,
  }, async (a) => toList(await client.get<SslCertificate[]>("/sslcertificates", { skip: a.skip, take: a.take })));

  defineTool(server, "combell_ssl_certificates_get", {
    description: "Get an SSL certificate by its SHA-1 fingerprint, including its subject alternative names.",
    input: { sha1_fingerprint: z.string().describe("SHA-1 fingerprint (see combell_ssl_certificates_list)") },
    annotations: READ,
  }, async (a) => (await client.get<SslCertificateDetail>(p`/sslcertificates/${a.sha1_fingerprint}`)).data);

  defineTool(server, "combell_ssl_certificate_requests_list", {
    description: "List the pending SSL certificate requests (orders that are not issued yet).",
    input: { ...pageFields },
    annotations: READ,
  }, async (a) => toList(await client.get<SslCertificateRequest[]>("/sslcertificaterequests", { skip: a.skip, take: a.take })));

  defineTool(server, "combell_ssl_certificate_requests_get", {
    description:
      "Get an SSL certificate request. While ongoing it returns the domain validations to complete (DNS CNAME, file upload or e-mail) " +
      "and a short-lived provider portal URL. When the certificate has been issued the result reports status 'completed' with the " +
      "certificate location (HTTP 303); when the request no longer exists without a certificate it reports 'gone' (HTTP 410).",
    input: { id: z.number().int().describe("The certificate request id") },
    annotations: READ,
  }, async (a) => {
    const res = await client.get<SslCertificateRequestDetail>(p`/sslcertificaterequests/${a.id}`, undefined, [303, 410]);
    if (res.status === 303) {
      return { id: a.id, status: "completed", certificate_location: res.location, certificate_sha1_fingerprint: idFromLocation(res.location) };
    }
    if (res.status === 410) return { id: a.id, status: "gone", message: "The certificate request no longer exists and no certificate was created." };
    return { id: a.id, status: "ongoing", ...res.data };
  });

  defineTool(server, "combell_ssl_certificate_requests_create", {
    description:
      "Order an SSL certificate from a certificate signing request (CSR). SIDE EFFECT: this purchases a paying product at your " +
      "contract's (non-promotional) price. The CSR subject must contain CN, C, ST, L, O and E, and all SANs. After creation, " +
      "complete the domain validations listed by combell_ssl_certificate_requests_get and then call combell_ssl_certificate_requests_verify.",
    input: {
      csr: z.string().describe("PEM-encoded certificate signing request"),
      certificate_type: z.enum(CERT_TYPES),
      validation_level: z.enum(VALIDATION_LEVELS),
      additional_validation_attributes: z.array(z.object({ name: z.string(), value: z.string() })).optional().describe(
        "Required for organization/extended validation: Firstname, Lastname, Phone, EmailAddress (technical contact), Street, Number, PostalCode, VatCountryCode; optional OrganizationNumber"
      ),
    },
    annotations: WRITE,
  }, async (a) => created(await client.post("/sslcertificaterequests", {
    csr: a.csr,
    certificate_type: a.certificate_type,
    validation_level: a.validation_level,
    ...(a.additional_validation_attributes?.length ? { additional_validation_attributes: a.additional_validation_attributes } : {}),
  })));

  defineTool(server, "combell_ssl_certificate_requests_verify", {
    description:
      "Ask Combell to verify the domain validations of a certificate request once every non auto-validated value is in place. " +
      "Calling it once is enough; verification takes some time. Reports 'completed' (303) or 'gone' (410) like the get tool.",
    input: { id: z.number().int().describe("The certificate request id") },
    annotations: WRITE,
  }, async (a) => {
    const res = await client.put(p`/sslcertificaterequests/${a.id}`, undefined, [303, 410]);
    if (res.status === 303) return { id: a.id, status: "completed", certificate_location: res.location };
    if (res.status === 410) return { id: a.id, status: "gone" };
    return accepted(res, { id: a.id, message: "Verification requested; check back with combell_ssl_certificate_requests_get." });
  });
}
