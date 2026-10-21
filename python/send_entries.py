"""Sends every user's entries for the drawing taking entries now, in batches
of 1,000, then prints the drawing's totals. Run it from a daily job, well
before the campaign's cutoff.

    python send_entries.py users.json

users.json is a list of {"id": "...", "entries": 3}. In your app this comes
from your own database instead. Settings come from .env, or the environment.
"""

import hashlib
import hmac
import json
import os
import random
import sys
import time
from datetime import datetime
from pathlib import Path

import requests

BATCH = 1000
# Nothing is sent this close to the cutoff, the request timeout, so no
# request can arrive after it and land in the next drawing.
MARGIN = 30


def load_env(path: Path) -> None:
    """Reads KEY=value lines into the environment, without overriding it."""
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())


def api_base(key: str) -> str:
    """A pr_sandbox_ key talks to the sandbox, a pr_prod_ key to the live site."""
    if key.startswith("pr_sandbox_"):
        return "https://sandbox.prizerail.com/api/v1"
    return "https://www.prizerail.com/api/v1"


def entrant_id(user_id: str, secret: str) -> str:
    """An HMAC of your user id, so the list Prizerail publishes can't be
    linked back to anyone. Keep the secret fixed for the whole campaign."""
    return hmac.new(secret.encode(), user_id.encode(), hashlib.sha256).hexdigest()


def retry_after(res) -> float | None:
    """Seconds from a Retry-After header, or None if it isn't a number."""
    try:
        seconds = float(res.headers.get("Retry-After", ""))
        return seconds if seconds > 0 else None
    except (AttributeError, ValueError):
        return None


class Client:
    def __init__(self, key: str, campaign: str):
        self.url = f"{api_base(key)}/campaigns/{campaign}/entries"
        self.session = requests.Session()
        self.session.headers["Authorization"] = f"Bearer {key}"

    def target_drawing(self) -> dict:
        """The drawing taking entries now, and its cutoff as a timestamp."""
        res = self.session.get(self.url, params={"limit": 1}, timeout=30)
        if not res.ok:
            raise RuntimeError(f"{res.status_code}: {res.text}")
        drawing = res.json()["drawing"]
        cutoff = datetime.fromisoformat(drawing["cutoffAt"].replace("Z", "+00:00"))
        return {"id": drawing["id"], "cutoff": cutoff.timestamp(), "cutoffAt": drawing["cutoffAt"]}

    def post_with_retry(self, body: dict, target: dict) -> dict:
        for attempt in range(7):
            try:
                res = self.session.post(self.url, json=body, timeout=30)
            except requests.RequestException:
                res = None  # A timeout or network error: retried like a 5xx.
            if res is not None and res.ok:
                return res.json()
            retryable = res is None or res.status_code == 429 or res.status_code >= 500
            if not retryable or attempt == 6:
                detail = f"{res.status_code} {res.text}" if res is not None else "network error"
                raise RuntimeError(f"entries failed: {detail}")
            # Retry-After when given, otherwise about 2, 4, 8 … seconds, jittered.
            wait = retry_after(res) or 2 ** (attempt + 1) * (0.5 + random.random())
            # A retry after the cutoff would go to the next drawing, and this
            # request may already be stored. Stop rather than enter people twice.
            if time.time() + wait + MARGIN >= target["cutoff"]:
                raise RuntimeError(
                    f"Drawing {target['id']}'s cutoff is too close to retry. "
                    f"Check which entries it has with GET /entries?drawing={target['id']}."
                )
            time.sleep(wait)
            # Sleep can overrun, for example on a suspended machine, so check again.
            if time.time() + MARGIN >= target["cutoff"]:
                raise RuntimeError(
                    f"Drawing {target['id']}'s cutoff passed while waiting to retry. "
                    f"Check which entries it has with GET /entries?drawing={target['id']}."
                )
        raise AssertionError("unreachable")

    def send_entries(self, entrants: list[dict]) -> dict:
        target = self.target_drawing()
        # The drawing's own totals, from the last response. Counting added and
        # unchanged per batch would go wrong after a retry, since a batch stored
        # before its answer was lost comes back as unchanged.
        totals = {"drawing": target, "sent": 0, "entrantCount": 0, "totalEntries": 0}
        for i in range(0, len(entrants), BATCH):
            if time.time() + MARGIN >= target["cutoff"]:
                raise RuntimeError(
                    f"Drawing {target['id']}'s cutoff is too close: {i} entrants sent, the rest not."
                )
            batch = entrants[i : i + BATCH]
            res = self.post_with_retry({"entrants": batch}, target)
            # Every batch must land in the drawing read before the first one.
            if res["drawing"]["id"] != target["id"]:
                raise RuntimeError(
                    f"The cutoff passed after {i} entrants: the rest went to drawing "
                    f"{res['drawing']['id']}, not {target['id']}."
                )
            totals["sent"] += len(batch)
            totals["entrantCount"] = res["entrantCount"]
            totals["totalEntries"] = res["totalEntries"]
        return totals


def main() -> int:
    load_env(Path(__file__).with_name(".env"))
    key = os.environ.get("PRIZERAIL_API_KEY")
    campaign = os.environ.get("PRIZERAIL_CAMPAIGN")
    secret = os.environ.get("ENTRANT_ID_KEY")
    if not key or not campaign or not secret:
        print("Set PRIZERAIL_API_KEY, PRIZERAIL_CAMPAIGN and ENTRANT_ID_KEY in .env.", file=sys.stderr)
        return 2

    users = json.loads(Path(sys.argv[1] if len(sys.argv) > 1 else "users.json").read_text())
    # Sending a user again before the cutoff sets their entries, so rerunning
    # this is safe. Always send entries: leaving it out sets it back to 1.
    entrants = [
        {"entrantId": entrant_id(str(user["id"]), secret), "entries": user["entries"]}
        for user in users
    ]

    try:
        result = Client(key, campaign).send_entries(entrants)
    except RuntimeError as error:
        print(error, file=sys.stderr)
        return 1
    drawing = result["drawing"]
    print(f"Sent {result['sent']} entrants to drawing {drawing['id']} (closes {drawing['cutoffAt']}).")
    print(f"It now has {result['entrantCount']} entrants and {result['totalEntries']} entries.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
