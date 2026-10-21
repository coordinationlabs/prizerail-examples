// POST /api/referrals with { "userId": "...", "referralId": "..." } when a
// referral of yours completes. Each referral earns the referrer 5 entries.
import { hashEntrant, PrizerailError } from "prizerail";
import { campaign, entrantIdKey } from "@/lib/prizerail";

const ENTRIES_PER_REFERRAL = 5;

export async function POST(request: Request) {
  // In your app, call this from your own server code, or take the user from
  // their session. Never trust a user id sent by the browser.
  const body = await request.json().catch(() => null);
  const userId = typeof body?.userId === "string" ? body.userId : "";
  const referralId = typeof body?.referralId === "string" ? body.referralId : "";
  if (!userId || !referralId) {
    return Response.json(
      { error: "Send userId and referralId." },
      { status: 400 }
    );
  }

  try {
    const result = await campaign.entries.increment([
      {
        entrantId: await hashEntrant(userId, entrantIdKey),
        entries: ENTRIES_PER_REFERRAL,
        // Names the referral, not this request, so a retry or a second
        // delivery of the same referral is ignored instead of counted twice.
        eventId: `referral:${referralId}`,
      },
    ]);
    return Response.json({
      counted: result.duplicates === 0,
      drawing: result.drawings[0]?.id ?? null,
    });
  } catch (error) {
    if (error instanceof PrizerailError) {
      return Response.json(
        { error: error.code, message: error.message },
        { status: 502 }
      );
    }
    throw error;
  }
}
