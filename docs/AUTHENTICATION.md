# Authentication: Combell API HMAC

This guide walks through obtaining the credentials required to run `combell-mcp-boostu` and explains how the server signs requests.

---

## Overview

The Combell API v2 uses **HMAC authentication** with an API key and secret. There is no OAuth flow, no access token and no refresh token. You need:

| Variable | Where it comes from |
|----------|---------------------|
| `COMBELL_API_KEY` | My Combell > API |
| `COMBELL_API_SECRET` | My Combell > API (shown once when you generate the key) |

On top of that, the API is **restricted per IP address**: only whitelisted addresses can call it.

---

## Step 1: Generate an API key and secret

1. Sign in to [My Combell](https://my.combell.com) with an account that has access to the resources you want to manage.
2. Open the **API** section of the control panel.
3. Generate a new **API key**. Copy the **key** and the **secret**; the secret is only shown once.
4. Keep both safe. Anyone with the pair (from a whitelisted IP) can act on your whole Combell account. If the secret leaks, generate a new pair and remove the old one.

---

## Step 2: Whitelist your IP address

Still in My Combell > API, add the **public IP address** (or range) of the machine that will run the MCP server:

- On a laptop or desktop: your current public IP (search "what is my ip"). If your provider changes it, update the whitelist.
- In Docker or on a server: the server's outbound IP.
- For the hosted edition at combell-mcp.boostu.be: the IP shown in your dashboard.

Without a whitelisted IP every request answers `401 Unauthorized`.

---

## Step 3: Set the environment variables

```bash
export COMBELL_API_KEY=your-api-key
export COMBELL_API_SECRET=your-api-secret
```

Or place them in `.env` (which is git-ignored) and make sure your MCP host or process manager loads it. The MCP host configs in the [README](../README.md#-quick-start) pass them through the `env` block.

---

## How the signature is built

Every request carries this header:

```
Authorization: hmac <api key>:<signature>:<nonce>:<unix timestamp>
```

where `signature = Base64(HMAC-SHA256(secret, string-to-sign))` and the string to sign is the concatenation of:

| Part | Rule |
|------|------|
| api key | as is |
| method | lowercased (`get`, `post`, `put`, `delete`) |
| path + query | the relative path starting with `/v2`, **lowercased**, then URL-encoded as one string with **uppercase** hex (`/v2/accounts?take=5` becomes `%2Fv2%2Faccounts%3Ftake%3D5`) |
| timestamp | unix time in **seconds** |
| nonce | a random string, unique per request |
| content | `Base64(MD5(body))` when there is a request body, empty otherwise |

The implementation lives in `src/api/auth.ts` (`CombellAuth.sign`) and is covered by tests that recompute the expected value independently (`test/auth.test.ts`). The secret is only used as the HMAC key; it is never sent on the wire and never logged.

---

## Rate limits

The API answers every request with `X-RateLimit-Limit`, `X-RateLimit-Usage`, `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers. When the limit is reached it answers `429 Too Many Requests` with a `Retry-After`. The client retries **once** automatically when `Retry-After` is at most 5 seconds; otherwise the tool returns the error with the retry delay so the assistant can wait.

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `401 Unauthorized` with correct credentials | Your IP address is not whitelisted | Add your public IP in My Combell > API |
| `401 Unauthorized` right after generating a key | Key or secret pasted incorrectly, or the clock of your machine is off | Re-copy both values; make sure your system clock is synced (the timestamp is part of the signature) |
| `403 Forbidden` | The API user lacks the role for that operation (e.g. the finance role for renewal changes) | Use a key of a user with the right role |
| `Combell API credentials are not configured` | Env vars not set in the MCP host config | Add `COMBELL_API_KEY` and `COMBELL_API_SECRET` to the `env` block |
| `429 Too Many Requests` | Rate limit exceeded | Wait for the number of seconds in the message |
