# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in `combell-mcp-boostu`, please report it
privately. **Do not open a public GitHub issue.**

Email **nick@boostu.be** with:

- a description of the issue and its impact,
- steps to reproduce (a proof of concept if possible),
- the affected version or commit.

We aim to acknowledge reports within a few business days and will keep you updated on
remediation. Responsible disclosure is appreciated; please give us reasonable time to
release a fix before any public disclosure.

## Handling credentials

This server talks to the Combell API on your behalf using an API key and secret.

- Never commit `.env` files to version control; `.env` is listed in `.gitignore`.
- Treat your Combell **API key** and **API secret** as secrets. Anyone with these (and a
  whitelisted IP address) can manage every domain, hosting, mailbox and database on your
  Combell account.
- The secret never leaves the process: it is only used to compute the HMAC signature.
- If a credential is exposed, generate a new key and secret in My Combell > API immediately
  and remove the old one.
- Keep the IP whitelist in My Combell > API as tight as possible.

## Supported versions

Only the latest published version receives security updates.
