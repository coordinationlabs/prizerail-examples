# Prizerail examples

Small, working projects that use the [Prizerail partner API](https://docs.prizerail.com): send entries, add entries as users earn them, and show a draw's results. Each one runs against a sandbox account, so no real payouts are made while you try it.

| Project | What it shows |
| --- | --- |
| [`nextjs`](nextjs) | A route handler that adds entries when a user does something (here, a referral), and a page with the latest draw's winners and prizes. Uses the [`prizerail`](https://www.npmjs.com/package/prizerail) package. |
| [`node-worker`](node-worker) | A script for a daily job: sends every user's entries for the day in batches, then prints the drawing's totals. Uses the `prizerail` package. |
| [`python`](python) | The same daily send in Python, with plain `requests`, batching and safe retries. |

## Before you start

1. **A sandbox account.** [Sign up at sandbox.prizerail.com/signup](https://sandbox.prizerail.com/signup) with your company name and work email. The emailed link signs you in to the sandbox partner portal as the account's owner. Create a campaign there, then a `pr_sandbox_…` key under **Settings**, **API keys**. Sandbox draws run on Base Sepolia, a test network, and no real payouts are made.
2. **A secret for entrant ids.** Prizerail publishes every locked entrant list, hashed, so each user is sent as an HMAC of their user id, never the id itself. Make a random key once and keep it fixed for the life of the campaign:

   ```sh
   openssl rand -hex 32
   ```

Each project reads three settings from a `.env` file. Copy its `.env.example` to `.env` and fill them in:

| Variable | What it is |
| --- | --- |
| `PRIZERAIL_API_KEY` | Your `pr_sandbox_…` key. Keep it on your server. |
| `PRIZERAIL_CAMPAIGN` | Your campaign's slug, from the [sandbox partner portal](https://sandbox.prizerail.com/login). |
| `ENTRANT_ID_KEY` | The secret above, for making entrant ids. |

A `pr_sandbox_…` key talks to `https://sandbox.prizerail.com`, and a `pr_prod_…` key to `https://www.prizerail.com`, so the same code works in both once you go live.

## See a draw right away

Sandbox drawings close on their campaign's schedule. To draw one now instead, open the campaign in the [sandbox partner portal](https://sandbox.prizerail.com/login) and click the **"Draw now"** button on its open drawing, or call `POST /api/v1/campaigns/{slug}/drawings/{id}/run`. See [Draw now](https://docs.prizerail.com/api/drawings#draw-now-sandbox-only).

## More

- [Docs](https://docs.prizerail.com): the quickstart, every API page with copy-paste code, and how to verify a draw.
- [`prizerail` on npm](https://www.npmjs.com/package/prizerail): the typed client and the `npx prizerail verify` command.

MIT licensed. See [LICENSE](LICENSE).
