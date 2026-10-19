import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { ensureLocalUser, getViewer, readSession } from "@/lib/auth/viewer";
import { getEnv } from "@/lib/env";

/**
 * The user id that a write should be saved under. For use in Server Actions.
 *
 * A visitor who hasn't saved anything yet gets an anonymous (guest) account
 * here, on their first save. Its session cookie is set on the action's
 * response, and their data moves to their real account if they sign in later.
 */
export async function ownerForWrite(): Promise<string> {
  // Not getViewer(): its per-request cache would remember "no user" for the
  // re-render that follows this action, after we've just created one.
  if (getEnv().mode === "local") return (await ensureLocalUser()).id;
  const session = await readSession();
  if (session) return session.user.id;

  const result = await auth().api.signInAnonymous({ headers: await headers() });
  if (!result?.user?.id) throw new Error("Could not start a guest session.");
  return result.user.id;
}

/** The current owner for reads/edits of existing rows, or null. */
export async function currentOwnerId(): Promise<string | null> {
  const viewer = await getViewer();
  return viewer.user?.id ?? null;
}
