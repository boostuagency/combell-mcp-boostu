/**
 * HTTP client for the Combell API v2
 *
 * Base URL: https://api.combell.com (paths are prefixed with /v2).
 * The API is strictly JSON, snake_case, with skip/take pagination exposed through
 * X-Paging-* headers and rate limiting exposed through X-RateLimit-* headers.
 */

import type { CombellAuth } from "./auth.js";
import { buildQuery, type QueryValue } from "../lib/path.js";
import type { BadRequestResponse, PagingMeta, RateLimitMeta, ValidationErrorMessage } from "../types/index.js";

export const DEFAULT_BASE_URL = "https://api.combell.com";
export const API_VERSION = "/v2";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface ApiRequestOptions {
  method: HttpMethod;
  /** Path relative to /v2, e.g. "/accounts" or p`/dns/${domain}/records`. */
  path: string;
  /** Query parameters; undefined values are skipped. */
  query?: Record<string, QueryValue>;
  /** JSON body (serialised with JSON.stringify). */
  body?: unknown;
  /**
   * Status codes that are expected as non-error outcomes besides 2xx. The API uses
   * 303 (resource replaced, see Location) and 410 (gone) on SSL certificate requests.
   */
  allowStatuses?: number[];
}

export interface ApiResponse<T = unknown> {
  status: number;
  /** Parsed JSON body, or undefined for empty responses (201/202/204/303/410). */
  data: T | undefined;
  /** Location header, when the API points at a created resource or provisioning job. */
  location?: string;
  paging?: PagingMeta;
  rateLimit: RateLimitMeta;
}

export class CombellApiError extends Error {
  readonly status: number;
  readonly method: string;
  readonly path: string;
  readonly errorCode?: string;
  readonly validationErrors?: ValidationErrorMessage[];
  readonly retryAfter?: number;

  constructor(args: {
    status: number;
    method: string;
    path: string;
    message: string;
    errorCode?: string;
    validationErrors?: ValidationErrorMessage[];
    retryAfter?: number;
  }) {
    super(args.message);
    this.name = "CombellApiError";
    this.status = args.status;
    this.method = args.method;
    this.path = args.path;
    this.errorCode = args.errorCode;
    this.validationErrors = args.validationErrors;
    this.retryAfter = args.retryAfter;
  }
}

export interface CombellClientOptions {
  baseUrl?: string;
  /** Test seam / custom transport. Defaults to global fetch. */
  fetch?: typeof fetch;
  /**
   * When the API answers 429 with a Retry-After of at most this many seconds, wait and
   * retry once. 0 disables the retry. Default 5.
   */
  maxRetryAfterSeconds?: number;
}

function headerInt(headers: Headers, name: string): number | undefined {
  const v = headers.get(name);
  if (v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function parsePaging(headers: Headers): PagingMeta | undefined {
  const skipped = headerInt(headers, "x-paging-skipped");
  const take = headerInt(headers, "x-paging-take");
  const total = headerInt(headers, "x-paging-totalresults");
  if (skipped === undefined && take === undefined && total === undefined) return undefined;
  return { skipped: skipped ?? 0, take: take ?? 0, total: total ?? 0 };
}

export function parseRateLimit(headers: Headers): RateLimitMeta {
  return {
    limit: headerInt(headers, "x-ratelimit-limit"),
    usage: headerInt(headers, "x-ratelimit-usage"),
    remaining: headerInt(headers, "x-ratelimit-remaining"),
    reset: headerInt(headers, "x-ratelimit-reset"),
    retryAfter: headerInt(headers, "retry-after"),
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class CombellClient {
  private auth: CombellAuth;
  private baseUrl: string;
  private fetchImpl: typeof fetch;
  private maxRetryAfterSeconds: number;

  constructor(auth: CombellAuth, options: CombellClientOptions = {}) {
    this.auth = auth;
    this.baseUrl = (options.baseUrl ?? process.env.COMBELL_API_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.fetchImpl = options.fetch ?? fetch;
    this.maxRetryAfterSeconds = options.maxRetryAfterSeconds ?? 5;
  }

  /** Make a signed request. Throws CombellApiError on non-success status codes. */
  async request<T = unknown>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
    const pathWithQuery = `${API_VERSION}${options.path}${buildQuery(options.query)}`;
    const url = `${this.baseUrl}${pathWithQuery}`;
    const bodyText = options.body === undefined ? undefined : JSON.stringify(options.body);

    const attempt = async (): Promise<Response> => {
      const sig = this.auth.sign({ method: options.method, pathWithQuery, body: bodyText });
      const headers: Record<string, string> = {
        Authorization: sig.header,
        Accept: "application/json",
      };
      if (bodyText !== undefined) headers["Content-Type"] = "application/json";
      return this.fetchImpl(url, {
        method: options.method,
        headers,
        body: bodyText,
        // 303 carries meaning on SSL certificate requests; never follow it blindly.
        redirect: "manual",
      });
    };

    let response = await attempt();
    if (response.status === 429 && this.maxRetryAfterSeconds > 0) {
      const wait = headerInt(response.headers, "retry-after") ?? headerInt(response.headers, "x-ratelimit-reset");
      if (wait !== undefined && wait <= this.maxRetryAfterSeconds) {
        await sleep(wait * 1000);
        response = await attempt();
      }
    }

    const rateLimit = parseRateLimit(response.headers);
    const allowed = new Set(options.allowStatuses ?? []);
    if (!response.ok && !allowed.has(response.status)) {
      throw await this.toError(response, options.method, pathWithQuery, rateLimit);
    }

    const location = response.headers.get("location") ?? undefined;
    const paging = parsePaging(response.headers);
    const text = await response.text();
    let data: T | undefined;
    if (text.trim()) {
      try {
        data = JSON.parse(text) as T;
      } catch {
        data = text as unknown as T;
      }
    }
    return { status: response.status, data, location, paging, rateLimit };
  }

  get<T = unknown>(path: string, query?: Record<string, QueryValue>, allowStatuses?: number[]): Promise<ApiResponse<T>> {
    return this.request<T>({ method: "GET", path, query, allowStatuses });
  }
  post<T = unknown>(path: string, body?: unknown, allowStatuses?: number[]): Promise<ApiResponse<T>> {
    return this.request<T>({ method: "POST", path, body, allowStatuses });
  }
  put<T = unknown>(path: string, body?: unknown, allowStatuses?: number[]): Promise<ApiResponse<T>> {
    return this.request<T>({ method: "PUT", path, body, allowStatuses });
  }
  delete<T = unknown>(path: string, allowStatuses?: number[]): Promise<ApiResponse<T>> {
    return this.request<T>({ method: "DELETE", path, allowStatuses });
  }

  private async toError(response: Response, method: string, path: string, rateLimit: RateLimitMeta): Promise<CombellApiError> {
    const text = await response.text();
    let errorCode: string | undefined;
    let validationErrors: ValidationErrorMessage[] | undefined;
    let detail = text;
    try {
      const j = JSON.parse(text) as BadRequestResponse & { error_code?: string; error_text?: string };
      if (j.error_code) errorCode = j.error_code;
      if (j.validation_errors?.length) validationErrors = j.validation_errors;
      const parts: string[] = [];
      if (j.error_code || j.error_text) parts.push(`${j.error_code ?? ""} ${j.error_text ?? ""}`.trim());
      for (const v of validationErrors ?? []) parts.push(`${v.error_code}: ${v.error_text}`);
      if (parts.length) detail = parts.join("; ");
    } catch {
      /* not JSON; keep raw text */
    }
    const hints: Record<number, string> = {
      401: "Check COMBELL_API_KEY / COMBELL_API_SECRET and make sure the caller's IP address is whitelisted in My Combell > API.",
      403: "Access to this resource or operation is not allowed for this API key.",
      404: "The resource was not found. Check the domain name, account id or identifier.",
      410: "The resource is permanently no longer available.",
      429: `Rate limit exceeded${rateLimit.retryAfter !== undefined ? `; retry after ${rateLimit.retryAfter}s` : ""}.`,
    };
    const hint = hints[response.status];
    const message = `Combell API error [${method} ${path}]: ${response.status} ${response.statusText}${detail ? ` - ${detail}` : ""}${hint ? ` (${hint})` : ""}`;
    return new CombellApiError({
      status: response.status,
      method,
      path,
      message,
      errorCode,
      validationErrors,
      retryAfter: rateLimit.retryAfter,
    });
  }
}
