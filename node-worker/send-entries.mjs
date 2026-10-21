// Sends every user's entries for the drawing taking entries now, in batches
// of 1,000, then prints the drawing's totals. Run it from a daily job, well
// before the campaign's cutoff.
//
//   node --env-file=.env send-entries.mjs users.json
//
// users.json is a list of { "id": "...", "entries": 3 }. In your app this
// comes from your own database instead.
import { readFile } from "node:fs/promises";
import { Prizerail, PrizerailCutoffError, hashEntrant } from "prizerail";

const { PRIZERAIL_API_KEY, PRIZERAIL_CAMPAIGN, ENTRANT_ID_KEY } = process.env;
if (!PRIZERAIL_API_KEY || !PRIZERAIL_CAMPAIGN || !ENTRANT_ID_KEY) {
  console.error(
    "Set PRIZERAIL_API_KEY, PRIZERAIL_CAMPAIGN and ENTRANT_ID_KEY in .env."
  );
  process.exit(2);
}

// A pr_sandbox_ key talks to sandbox.prizerail.com, a pr_prod_ key to the live site.
const prizerail = new Prizerail({ apiKey: PRIZERAIL_API_KEY });
const campaign = prizerail.campaign(PRIZERAIL_CAMPAIGN);

const users = JSON.parse(await readFile(process.argv[2] ?? "users.json", "utf8"));

// Entrant ids are an HMAC of your user id, so the published list can't be
// linked back to anyone. Keep ENTRANT_ID_KEY fixed for the whole campaign.
const entrants = await Promise.all(
  users.map(async user => ({
    entrantId: await hashEntrant(String(user.id), ENTRANT_ID_KEY),
    entries: user.entries,
  }))
);

try {
  // Batches, retries and staying in one drawing are built in. Sending a user
  // again before the cutoff sets their entries, so rerunning this is safe.
  const result = await campaign.entries.send(entrants);
  console.log(
    `Sent ${result.sent} entrants to drawing ${result.drawing.id} (closes ${result.drawing.cutoffAt}).`
  );
  console.log(
    `It now has ${result.entrantCount} entrants and ${result.totalEntries} entries.`
  );
} catch (error) {
  // Too close to the cutoff to send safely: nothing more was sent. Check what
  // the drawing has before sending the rest to the next one.
  if (error instanceof PrizerailCutoffError) {
    console.error(
      `Stopped near the cutoff: ${error.progress.sent} entrants reached drawing ${error.progress.drawing.id}.`
    );
    process.exit(1);
  }
  throw error;
}
