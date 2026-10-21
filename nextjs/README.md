# Next.js: add entries as users earn them, show the latest draw

A small App Router app using the [`prizerail`](https://www.npmjs.com/package/prizerail) package on the server.

- [`app/api/referrals/route.ts`](app/api/referrals/route.ts) adds 5 entries to the referrer when a referral completes, with `entries.increment`.
- [`app/page.tsx`](app/page.tsx) shows the campaign's next draw and the latest draw's winners and prizes, with `drawings.latest()`.
- [`lib/prizerail.ts`](lib/prizerail.ts) makes the client. It imports `server-only`, so the key can't end up in the browser.

## Run it

1. `npm install`
2. Copy `.env.example` to `.env` and fill it in (see the [main README](../README.md#before-you-start)).
3. `npm run dev`, then open http://localhost:3000.

Add entries for a referral:

```sh
curl -X POST http://localhost:3000/api/referrals \
  -H 'content-type: application/json' \
  -d '{"userId":"alice","referralId":"r_123"}'
```

```json
{"counted":true,"drawing":"d7k2m9q4x1wz"}
```

Send the same referral again and it isn't counted twice: `{"counted":false,"drawing":null}`.

## How it works

- Each event has an `eventId` named after the referral, `referral:r_123`, never after the request. Prizerail ignores an `eventId` it has seen in the campaign, so a retry, a webhook delivered twice or a double click adds nothing. That holds after a cutoff too.
- Each user is sent as an HMAC of their user id (`hashEntrant`), so the list Prizerail publishes can't be linked back to anyone.
- The route takes `userId` from the request body to keep the example short. In your app, take it from the signed-in session or call `increment` from your own server code, never from a user id the browser sends.
- The page reads on each request, so a new draw shows without a rebuild. Its link goes to the campaign's public page, where anyone can check each draw.

See [Send entries](https://docs.prizerail.com/api/send-entries#adding-instead-of-setting) and [Drawings](https://docs.prizerail.com/api/drawings) for the details.
