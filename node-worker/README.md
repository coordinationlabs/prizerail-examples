# Node worker: send the day's entries

A script for a daily job. It sends every user's entries for the drawing taking entries now, in batches of 1,000, and prints the drawing's totals.

## Run it

1. `npm install`
2. Copy `.env.example` to `.env` and fill it in (see the [main README](../README.md#before-you-start)).
3. `npm run send`

You'll see which drawing the entries went to and its totals, for example:

```
Sent 5 entrants to drawing d7k2m9q4x1wz (closes 2026-10-21T00:55:00.000Z).
It now has 5 entrants and 23 entries.
```

## How it works

- Each user is sent as an HMAC of their user id (`hashEntrant`), so the list Prizerail publishes can't be linked back to anyone.
- `entries.send` splits the list into requests of 1,000, retries on errors, and keeps every batch in the same drawing.
- Sending a user again before the cutoff sets their entries, so rerunning the job is safe. Near the cutoff it stops and says how far it got, rather than letting a batch slip into the next drawing.

Replace `users.json` with a query against your own database. See [Send entries](https://docs.prizerail.com/api/send-entries) for the details.
