import { z } from "zod";
import type { ApiResponse } from "../api/client.js";
import type { ListResult } from "../types/index.js";

/** Shared skip/take input fields for collection endpoints. */
export const pageFields = {
  skip: z.number().int().min(0).optional().describe("Number of items to skip (default 0)"),
  take: z.number().int().min(1).max(500).optional().describe("Number of items to return (the API may return fewer)"),
};

/** Shape a collection response as { items, paging } so the caller can page further. */
export function toList<T>(res: ApiResponse<T[]>): ListResult<T> {
  const items = Array.isArray(res.data) ? res.data : [];
  return res.paging ? { items, paging: res.paging } : { items };
}
