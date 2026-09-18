# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [1.0.0] - 2026-09-18

### Added

- First release of **BoostU Combell MCP** (`combell-mcp-boostu`): an MCP server for the Combell API v2.
- HMAC authentication (`COMBELL_API_KEY` + `COMBELL_API_SECRET`) implemented as the API documents it: lowercased method, URL-encoded lowercased path, unix timestamp, random nonce and Base64(MD5) of the body, signed with HMAC-SHA256.
- Transport-agnostic `createServer(client)` core in `src/server.ts`, wired to stdio in `src/index.ts`.
- `COMBELL_TOOLS` environment variable for selective tool-group loading; unset loads all 12 groups.
- 74 tools across:
  - **Accounts and servicepacks**: list, get, create (provisioning job), servicepacks list
  - **Provisioning jobs**: poll a job until finished
  - **Domains**: list, get, register, transfer, set name servers, toggle renewal
  - **DNS records**: list (with type/name/service filters), get, create, update (read-merge-write), delete
  - **Linux hostings**: list, get, PHP versions, PHP version/memory limit/APCu, GZIP, FTP, subsites, host headers, HTTP/2, Let's Encrypt, HTTPS redirect
  - **Scheduled tasks**: list, get, create, update (read-merge-write), delete
  - **SSH**: account-wide key overview, per-hosting SSH toggle, keys list/add/delete
  - **Windows hostings**: list, get
  - **Mailboxes**: list, get, create, delete, password, auto-reply, auto-forward
  - **Mail zones**: get, catch-all create/delete, anti-spam, aliases create/update/delete, SMTP domains create/update/delete
  - **MySQL**: databases list/get/create/delete, users list/create/status/password/delete
  - **SSL**: certificates list/get, certificate requests list/get/create/verify (303/410 mapped to completed/gone)
- Tool annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`) on every tool, and `SIDE EFFECT` notes on purchases and irreversible operations.
- Collection responses shaped as `{ items, paging }` from the `X-Paging-*` headers; 202 responses shaped with the provisioning job id to poll.
- One automatic retry on HTTP 429 when `Retry-After` is at most 5 seconds.
- Vitest test suite (HMAC vectors, client, path encoding, tool behaviour, registration), GitHub Actions CI, issue templates, `docs/AUTHENTICATION.md`, `docs/combell-endpoints.md`, `CONTRIBUTING.md`, `SECURITY.md`, `RELEASING.md`.
