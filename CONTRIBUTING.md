# Contributing to BoostU Combell MCP

Thank you for your interest in contributing! This document covers everything you need to get started.

---

## Development setup

```bash
git clone https://github.com/boostuagency/combell-mcp-boostu.git
cd combell-mcp-boostu
npm install
```

Run the server in development mode (TypeScript is executed directly via `tsx`, no build required):

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

---

## Before submitting a pull request

Run both of these and fix any failures before opening a PR:

```bash
npm test          # vitest unit tests
npm run typecheck # TypeScript type checking (tsc --noEmit)
```

All tests must pass and there must be no type errors.

---

## Commit conventions

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add ssl certificate download tool
fix: encode e-mail addresses in mail zone paths
docs: update authentication guide
chore: bump @modelcontextprotocol/sdk to 1.31.0
```

Scope is optional but encouraged when the change is domain-specific:

```
feat(dns): add TLSA record helper
fix(auth): uppercase percent-encoding in the string to sign
```

---

## Adding a new tool group

Follow these steps to add a new domain (e.g. `fooBar`):

### 1. Create `src/tools/fooBar.ts`

Use the `defineTool` helper; it wraps the handler in `try / respond / catch / respondError` and registers the tool with annotations:

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CombellClient } from "../api/client.js";
import { defineTool, READ } from "../lib/tool.js";
import { pageFields, toList } from "../lib/paging.js";
import { p } from "../lib/path.js";

export function registerFooBarTools(server: McpServer, client: CombellClient): void {
  defineTool(server, "combell_foobars_list", {
    description: "List foo bars.",
    input: { ...pageFields },
    annotations: READ,
  }, async (a) => toList(await client.get("/foobars", { skip: a.skip, take: a.take })));

  defineTool(server, "combell_foobars_get", {
    description: "Get a foo bar by name.",
    input: { name: z.string() },
    annotations: READ,
  }, async (a) => (await client.get(p`/foobars/${a.name}`)).data);
}
```

Always build paths with the `p` tagged template so path parameters (domain names, e-mail addresses, fingerprints) are percent-encoded, and pick the matching annotation constant: `READ`, `WRITE`, `UPDATE` or `DESTRUCTIVE`.

### 2. Add the group to `src/server.ts`

Import the registrar and add an entry to the `GROUPS` map:

```typescript
import { registerFooBarTools } from "./tools/fooBar.js";

export const GROUPS: Record<string, Register> = {
  // ... existing groups ...
  fooBar: registerFooBarTools,
};
```

### 3. Add tests

- Add the new tool names to `test/registration.test.ts`.
- Add a behavioural test in `test/tools.test.ts` that asserts the exact path, query and body the tool sends (drive the handler with the fake client).

### 4. Document the endpoints

Add the endpoints to `docs/combell-endpoints.md` and the tools to the README table.

---

## Code style

- TypeScript strict mode is enabled; no `any` unless truly unavoidable.
- Keep tool descriptions concise and accurate; they are exposed directly to the AI.
- Mark operations that purchase something or cannot be undone with `SIDE EFFECT:` in the description and the `DESTRUCTIVE` annotation where appropriate.
- Do not add dependencies without discussion; the dependency footprint should stay minimal.

---

## Reporting issues

Use the GitHub issue templates:

- **Bug report** for unexpected behavior, API errors, or type errors.
- **Feature request** for new tool groups, new tools within an existing group, or other enhancements.

For security vulnerabilities, email **nick@boostu.be** directly; do not open a public issue.
