import type { McpServer, ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ShapeOutput } from "@modelcontextprotocol/sdk/server/zod-compat.js";
import type { ZodRawShape } from "zod";
import { respond, respondError } from "./respond.js";

export interface ToolAnnotations {
  /** The tool only reads; it never changes anything. */
  readOnlyHint?: boolean;
  /** The tool may delete or irreversibly change data (or order a paid product). */
  destructiveHint?: boolean;
  /** Calling the tool twice with the same arguments has no additional effect. */
  idempotentHint?: boolean;
}

export interface ToolSpec<Args extends ZodRawShape> {
  description: string;
  input: Args;
  annotations?: ToolAnnotations;
}

export const READ: ToolAnnotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true };
export const WRITE: ToolAnnotations = { readOnlyHint: false, destructiveHint: false, idempotentHint: false };
export const UPDATE: ToolAnnotations = { readOnlyHint: false, destructiveHint: false, idempotentHint: true };
export const DESTRUCTIVE: ToolAnnotations = { readOnlyHint: false, destructiveHint: true, idempotentHint: false };

/** The parsed arguments a tool handler receives for its zod input shape. */
export type ToolArgs<Args extends ZodRawShape> = ShapeOutput<Args>;

type Handler<Args extends ZodRawShape> = (args: ToolArgs<Args>) => Promise<unknown>;

/**
 * Register a tool with the shared try / respond / catch / respondError behaviour.
 * The handler returns plain data; errors become isError text results with the API message.
 */
export function defineTool<Args extends ZodRawShape>(
  server: McpServer,
  name: string,
  spec: ToolSpec<Args>,
  handler: Handler<Args>
): void {
  // ToolCallback<Args> is a deferred conditional type while Args is generic, so TS cannot
  // relate the concrete arrow to it; the handler boundary above keeps the argument typing.
  const callback = (async (args: ToolArgs<Args>) => {
    try {
      return respond(await handler(args));
    } catch (e) {
      return respondError(e instanceof Error ? e.message : String(e));
    }
  }) as unknown as ToolCallback<Args>;
  server.registerTool<ZodRawShape, Args>(
    name,
    {
      description: spec.description,
      inputSchema: spec.input,
      annotations: { title: name, ...spec.annotations },
    },
    callback
  );
}
