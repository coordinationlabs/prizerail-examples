# Python: send the day's entries

The same daily job as [`node-worker`](../node-worker), in Python with plain `requests`. It sends every user's entries for the drawing taking entries now, in batches of 1,000, with safe retries, and prints the drawing's totals.

## Run it

Python 3.10 or later.

1. `python -m venv .venv && . .venv/bin/activate`
2. `pip install -r requirements.txt`
3. Copy `.env.example` to `.env` and fill it in (see the [main README](../README.md#before-you-start)).
4. `python send_entries.py users.json`

You'll see which drawing the entries went to and its totals, for example:

```
Sent 5 entrants to drawing d7k2m9q4x1wz (closes 2026-10-21T00:55:00.000Z).
It now has 5 entrants and 23 entries.
```

## How it works

- Each user is sent as an HMAC-SHA256 of their user id, the same as `hashEntrant` in the `prizerail` package, so the two give the same entrant ids.
- Before the first batch it reads which drawing is taking entries and when its cutoff is, and every batch must land in that drawing.
- A `429`, a `5xx`, a timeout or a network error is retried with a growing, jittered wait, honoring `Retry-After`. Sending a user again before the cutoff sets their entries, so these retries are safe.
- Within 30 seconds of the cutoff it sends nothing more and says how far it got, since a retry after the cutoff would go to the next drawing. Send well before the cutoff.

Replace `users.json` with a query against your own database. See [Send entries](https://docs.prizerail.com/api/send-entries) for the details.
