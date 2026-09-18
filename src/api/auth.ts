/**
 * HMAC authentication for the Combell API v2
 *
 * Every request carries an `Authorization: hmac <key>:<signature>:<nonce>:<timestamp>`
 * header. The signature is Base64(HMAC-SHA256(secret, apikey + method + path + timestamp
 * + nonce + content)), where:
 *   - method is lowercased ("get", "post", ...)
 *   - path is the URL-encoded, lowercased relative path + query string, starting with /v2,
 *     with uppercase percent-encoding
 *   - timestamp is the unix time in seconds
 *   - nonce is a random, unique string per request
 *   - content is Base64(MD5(body)) when there is a body, otherwise empty
 *
 * See https://api.combell.com/v2/documentation (Authentication).
 */

import { createHash, createHmac, randomBytes } from "node:crypto";
import type { CombellAuthConfig } from "../types/index.js";

export interface SignInput {
  /** HTTP method, any case. */
  method: string;
  /** Relative path + query as sent on the wire, starting with /v2 (e.g. "/v2/accounts?take=10"). */
  pathWithQuery: string;
  /** Raw request body string (JSON), or undefined/empty for no body. */
  body?: string;
  /** Test seam: unix timestamp in seconds. Defaults to now. */
  timestamp?: number;
  /** Test seam: nonce. Defaults to a random 16-byte hex string. */
  nonce?: string;
}

export interface Signature {
  /** Value for the Authorization header. */
  header: string;
  signature: string;
  nonce: string;
  timestamp: number;
}

/**
 * RFC 3986 percent-encoding with uppercase hex, matching .NET's Uri.EscapeDataString
 * (which the Combell backend uses to reconstruct the signed path). encodeURIComponent
 * leaves !'()* alone, so encode those explicitly.
 */
export function rfc3986Encode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

/** The path component of the string-to-sign: lowercased, then URL-encoded as a whole. */
export function encodePathForSignature(pathWithQuery: string): string {
  return rfc3986Encode(pathWithQuery.toLowerCase());
}

/** Base64(MD5(body)) for non-empty bodies; empty string otherwise. */
export function contentHash(body: string | undefined): string {
  if (!body) return "";
  return createHash("md5").update(body, "utf8").digest("base64");
}

export function newNonce(): string {
  return randomBytes(16).toString("hex");
}

export class CombellAuth {
  private config: CombellAuthConfig;

  constructor(config: CombellAuthConfig) {
    this.config = { ...config };
  }

  get apiKey(): string {
    return this.config.apiKey;
  }

  /** True when both key and secret are present. Tool calls fail with a clear error otherwise. */
  isConfigured(): boolean {
    return Boolean(this.config.apiKey && this.config.apiSecret);
  }

  /** Build the string-to-sign exactly as the API documents it. */
  stringToSign(input: Required<Pick<SignInput, "method" | "pathWithQuery" | "timestamp" | "nonce">> & { body?: string }): string {
    return (
      this.config.apiKey +
      input.method.toLowerCase() +
      encodePathForSignature(input.pathWithQuery) +
      String(input.timestamp) +
      input.nonce +
      contentHash(input.body)
    );
  }

  sign(input: SignInput): Signature {
    if (!this.isConfigured()) {
      throw new Error(
        "Combell API credentials are not configured. Set COMBELL_API_KEY and COMBELL_API_SECRET."
      );
    }
    const timestamp = input.timestamp ?? Math.floor(Date.now() / 1000);
    const nonce = input.nonce ?? newNonce();
    const toSign = this.stringToSign({
      method: input.method,
      pathWithQuery: input.pathWithQuery,
      timestamp,
      nonce,
      body: input.body,
    });
    const signature = createHmac("sha256", this.config.apiSecret).update(toSign, "utf8").digest("base64");
    return {
      header: `hmac ${this.config.apiKey}:${signature}:${nonce}:${timestamp}`,
      signature,
      nonce,
      timestamp,
    };
  }
}
