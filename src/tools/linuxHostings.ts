/**
 * Linux hostings: overview, detail, PHP settings, GZIP, FTP, subsites, host headers,
 * HTTP/2, Let's Encrypt and HTTPS redirect.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CombellClient } from "../api/client.js";
import { defineTool, DESTRUCTIVE, READ, UPDATE, WRITE } from "../lib/tool.js";
import { pageFields, toList } from "../lib/paging.js";
import { created, done } from "../lib/results.js";
import { p } from "../lib/path.js";
import type { LinuxHosting, LinuxHostingDetail, PhpVersion } from "../types/index.js";

export function registerLinuxHostingTools(server: McpServer, client: CombellClient): void {
  defineTool(server, "combell_linux_hostings_list", {
    description: "List the Linux hosting accounts (by domain name) on your Combell account.",
    input: { ...pageFields },
    annotations: READ,
  }, async (a) => toList(await client.get<LinuxHosting[]>("/linuxhostings", { skip: a.skip, take: a.take })));

  defineTool(server, "combell_linux_hostings_get", {
    description:
      "Get the details of a Linux hosting: webspace size and usage, IP, FTP/SSH status and usernames, active PHP version, " +
      "websites with host headers and SSL settings, and linked MySQL database names.",
    input: { domain_name: z.string().describe("The Linux hosting domain name") },
    annotations: READ,
  }, async (a) => (await client.get<LinuxHostingDetail>(p`/linuxhostings/${a.domain_name}`)).data);

  defineTool(server, "combell_linux_hostings_php_versions", {
    description: "List the PHP versions available for a Linux hosting.",
    input: { domain_name: z.string() },
    annotations: READ,
  }, async (a) => toList(await client.get<PhpVersion[]>(p`/linuxhostings/${a.domain_name}/phpsettings/availableversions`)));

  defineTool(server, "combell_linux_hostings_set_php_version", {
    description: "Change the PHP version of a Linux hosting. SIDE EFFECT: affects every website on the hosting immediately.",
    input: { domain_name: z.string(), version: z.string().describe("A version from combell_linux_hostings_php_versions, e.g. '8.3'") },
    annotations: UPDATE,
  }, async (a) => {
    await client.put(p`/linuxhostings/${a.domain_name}/phpsettings/version`, { version: a.version });
    return done("php_version_updated", { domain_name: a.domain_name, version: a.version });
  });

  defineTool(server, "combell_linux_hostings_set_php_memory_limit", {
    description: "Set the PHP memory limit (in MB) of a Linux hosting.",
    input: { domain_name: z.string(), memory_limit: z.number().int().positive().describe("Memory limit in MB, e.g. 256") },
    annotations: UPDATE,
  }, async (a) => {
    await client.put(p`/linuxhostings/${a.domain_name}/phpsettings/memorylimit`, { memory_limit: a.memory_limit });
    return done("php_memory_limit_updated", { domain_name: a.domain_name, memory_limit: a.memory_limit });
  });

  defineTool(server, "combell_linux_hostings_set_php_apcu", {
    description: "Enable or disable PHP APCu caching on a Linux hosting and set its size (in MB).",
    input: {
      domain_name: z.string(),
      enabled: z.boolean(),
      apcu_size: z.number().int().positive().optional().describe("APCu cache size in MB"),
    },
    annotations: UPDATE,
  }, async (a) => {
    await client.put(p`/linuxhostings/${a.domain_name}/phpsettings/apcu`, {
      enabled: a.enabled,
      ...(a.apcu_size !== undefined ? { apcu_size: a.apcu_size } : {}),
    });
    return done("php_apcu_updated", { domain_name: a.domain_name, enabled: a.enabled, apcu_size: a.apcu_size });
  });

  defineTool(server, "combell_linux_hostings_set_gzip", {
    description: "Enable or disable GZIP compression on a Linux hosting.",
    input: { domain_name: z.string(), enabled: z.boolean() },
    annotations: UPDATE,
  }, async (a) => {
    await client.put(p`/linuxhostings/${a.domain_name}/settings/gzipcompression`, { enabled: a.enabled });
    return done("gzip_updated", { domain_name: a.domain_name, enabled: a.enabled });
  });

  defineTool(server, "combell_linux_hostings_set_ftp", {
    description: "Enable or disable FTP access on a Linux hosting.",
    input: { domain_name: z.string(), enabled: z.boolean() },
    annotations: UPDATE,
  }, async (a) => {
    await client.put(p`/linuxhostings/${a.domain_name}/ftp/configuration`, { enabled: a.enabled });
    return done("ftp_updated", { domain_name: a.domain_name, enabled: a.enabled });
  });

  defineTool(server, "combell_linux_hostings_subsites_create", {
    description:
      "Create a subsite (an extra website) on a Linux hosting. The folder path must already exist on the server; " +
      "when omitted Combell uses /subsites/<subsite domain>.",
    input: {
      domain_name: z.string().describe("The Linux hosting domain name"),
      subsite_domain_name: z.string().describe("Domain name for the subsite, e.g. 'alias.be' or 'blog.example.be'"),
      path: z.string().optional().describe("Existing folder on the hosting, e.g. '/subsites/blog.example.be'"),
    },
    annotations: WRITE,
  }, async (a) => created(await client.post(p`/linuxhostings/${a.domain_name}/subsites`, {
    domain_name: a.subsite_domain_name,
    ...(a.path ? { path: a.path } : {}),
  }), { domain_name: a.domain_name, subsite_domain_name: a.subsite_domain_name }));

  defineTool(server, "combell_linux_hostings_subsites_delete", {
    description: "Delete a subsite from a Linux hosting. SIDE EFFECT: the website stops being served (files stay on disk).",
    input: { domain_name: z.string(), site_name: z.string().describe("Name of the site on the hosting (see the hosting detail's sites)") },
    annotations: DESTRUCTIVE,
  }, async (a) => {
    await client.delete(p`/linuxhostings/${a.domain_name}/subsites/${a.site_name}`);
    return done("subsite_deleted", { domain_name: a.domain_name, site_name: a.site_name });
  });

  defineTool(server, "combell_linux_hostings_host_headers_create", {
    description: "Add a host header (an extra domain name or alias that serves the site) to a website on a Linux hosting.",
    input: {
      domain_name: z.string().describe("The Linux hosting domain name"),
      site_name: z.string().describe("Name of the site on the hosting"),
      host_header: z.string().describe("Domain name to add as host header, e.g. 'alias.be' or 'alias.example.be'"),
    },
    annotations: WRITE,
  }, async (a) => created(await client.post(p`/linuxhostings/${a.domain_name}/sites/${a.site_name}/hostheaders`, {
    domain_name: a.host_header,
  }), { domain_name: a.domain_name, site_name: a.site_name, host_header: a.host_header }));

  defineTool(server, "combell_linux_hostings_set_http2", {
    description: "Enable or disable HTTP/2 for a website on a Linux hosting. The site must have SSL enabled for HTTP/2 to work.",
    input: { domain_name: z.string(), site_name: z.string(), enabled: z.boolean() },
    annotations: UPDATE,
  }, async (a) => {
    await client.put(p`/linuxhostings/${a.domain_name}/sites/${a.site_name}/http2/configuration`, { enabled: a.enabled });
    return done("http2_updated", { domain_name: a.domain_name, site_name: a.site_name, enabled: a.enabled });
  });

  defineTool(server, "combell_linux_hostings_set_letsencrypt", {
    description: "Enable or disable a free Let's Encrypt SSL certificate for a hostname on a Linux hosting.",
    input: {
      domain_name: z.string().describe("The Linux hosting domain name"),
      hostname: z.string().describe("The hostname to secure, e.g. 'www.example.be'"),
      enabled: z.boolean(),
    },
    annotations: UPDATE,
  }, async (a) => {
    await client.put(p`/linuxhostings/${a.domain_name}/sslsettings/${a.hostname}/letsencrypt`, { enabled: a.enabled });
    return done("letsencrypt_updated", { domain_name: a.domain_name, hostname: a.hostname, enabled: a.enabled });
  });

  defineTool(server, "combell_linux_hostings_set_https_redirect", {
    description: "Enable or disable the automatic HTTP to HTTPS redirect for a hostname on a Linux hosting.",
    input: {
      domain_name: z.string().describe("The Linux hosting domain name"),
      hostname: z.string().describe("The hostname, e.g. 'www.example.be'"),
      enabled: z.boolean(),
    },
    annotations: UPDATE,
  }, async (a) => {
    await client.put(p`/linuxhostings/${a.domain_name}/sslsettings/${a.hostname}/autoredirect`, { enabled: a.enabled });
    return done("https_redirect_updated", { domain_name: a.domain_name, hostname: a.hostname, enabled: a.enabled });
  });
}
