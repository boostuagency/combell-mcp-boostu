import { rfc3986Encode } from "../api/auth.js";

/**
 * Tagged template that percent-encodes interpolated path segments, so a value such as
 * "info@example.be" or "*.example.be" can never break out of its path position.
 *
 *   p`/dns/${domain}/records/${id}`  ->  "/dns/example.be/records/42"
 */
export function p(strings: TemplateStringsArray, ...values: Array<string | number>): string {
  let out = "";
  strings.forEach((s, i) => {
    out += s;
    if (i < values.length) out += rfc3986Encode(String(values[i]));
  });
  return out;
}

export type QueryValue = string | number | boolean | undefined | null;

/** Build a query string from a record, skipping undefined/null values. Keys stay as given. */
export function buildQuery(query: Record<string, QueryValue> | undefined): string {
  if (!query) return "";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    parts.push(`${rfc3986Encode(k)}=${rfc3986Encode(String(v))}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}
