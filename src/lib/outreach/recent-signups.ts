const CLERK_API = "https://api.clerk.com/v1";

interface ClerkEmailAddress { id: string; email_address: string }
interface ClerkUser {
  id: string;
  first_name: string | null;
  created_at: number; // ms epoch
  primary_email_address_id: string | null;
  email_addresses: ClerkEmailAddress[];
  private_metadata: Record<string, unknown>;
}

export interface Signup {
  id: string;
  firstName: string | null;
  email: string | null;
  createdAt: number;
  day7Sent: boolean;
}

function primaryEmail(u: ClerkUser): string | null {
  const primary = u.email_addresses.find((a) => a.id === u.primary_email_address_id);
  return primary?.email_address ?? u.email_addresses[0]?.email_address ?? null;
}

function clerkKey(): string {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) throw new Error("CLERK_SECRET_KEY not set");
  return key;
}

/**
 * Lists Clerk users whose account was created within [afterMs, beforeMs].
 *
 * Pages through newest-first and filters on the user object's own `created_at`
 * (Unix ms) rather than the API's created_at_before/after query params, whose
 * unit is ambiguous. Because results are ordered desc, we stop as soon as a
 * page dips below `afterMs`.
 */
export async function listSignupsCreatedBetween(afterMs: number, beforeMs: number): Promise<Signup[]> {
  const out: Signup[] = [];
  const limit = 100;
  for (let offset = 0; ; offset += limit) {
    const url = `${CLERK_API}/users?order_by=-created_at&limit=${limit}&offset=${offset}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${clerkKey()}` } });
    if (!res.ok) throw new Error(`Clerk list users ${res.status}`);
    const users = (await res.json()) as ClerkUser[];
    if (users.length === 0) break;

    for (const u of users) {
      if (u.created_at > beforeMs) continue; // too new — hasn't reached day 7 yet
      if (u.created_at < afterMs) continue; // older than the window
      out.push({
        id: u.id,
        firstName: u.first_name,
        email: primaryEmail(u),
        createdAt: u.created_at,
        day7Sent: Boolean(u.private_metadata?.day7_email_sent_at),
      });
    }

    // Ordered newest-first: once a page's oldest row precedes the window, we're done.
    const oldestOnPage = users[users.length - 1]!.created_at;
    if (oldestOnPage < afterMs || users.length < limit) break;
  }
  return out;
}

export async function markDay7Sent(userId: string, atIso: string): Promise<void> {
  const res = await fetch(`${CLERK_API}/users/${userId}/metadata`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${clerkKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ private_metadata: { day7_email_sent_at: atIso } }),
  });
  if (!res.ok) throw new Error(`Clerk metadata patch ${res.status}`);
}
