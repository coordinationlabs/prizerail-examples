// Server only: the key must never reach the browser.
import "server-only";
import { Prizerail } from "prizerail";

const { PRIZERAIL_API_KEY, PRIZERAIL_CAMPAIGN, ENTRANT_ID_KEY } = process.env;
if (!PRIZERAIL_API_KEY || !PRIZERAIL_CAMPAIGN || !ENTRANT_ID_KEY) {
  throw new Error(
    "Set PRIZERAIL_API_KEY, PRIZERAIL_CAMPAIGN and ENTRANT_ID_KEY in .env."
  );
}

// A pr_sandbox_ key talks to sandbox.prizerail.com, a pr_prod_ key to the live site.
export const campaign = new Prizerail({ apiKey: PRIZERAIL_API_KEY }).campaign(
  PRIZERAIL_CAMPAIGN
);

// Entrant ids are an HMAC of your user id, so the list Prizerail publishes
// can't be linked back to anyone. Keep it fixed for the whole campaign.
export const entrantIdKey = ENTRANT_ID_KEY;
