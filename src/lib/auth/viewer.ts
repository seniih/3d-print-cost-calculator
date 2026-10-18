import "server-only";
import { headers } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { auth } from "@/lib/auth/server";

export const LOCAL_USER_ID = "local-user";

export type Viewer =
  /** Self-hosted instance without sign-in: one shared local user. */
  | { kind: "local"; user: ViewerUser }
  /** Signed in with Google or GitHub. */
  | { kind: "user"; user: ViewerUser }
  /** Guest who has saved something (anonymous account). */
  | { kind: "guest"; user: ViewerUser }
  /** Guest who has not saved anything yet. */
  | { kind: "anonymous"; user: null };

export type ViewerUser = {
  id: string;
  name: string;
  email: string | null;
  image: string | null;
};

async function ensureLocalUser(): Promise<ViewerUser> {
  const user = await db().user.upsert({
    where: { id: LOCAL_USER_ID },
    update: {},
    create: {
      id: LOCAL_USER_ID,
      name: "Local user",
      email: "local-user@localhost.invalid",
      emailVerified: true,
    },
  });
  return { id: user.id, name: user.name, email: null, image: null };
}

/**
 * Who is making this request. This is the single entry point for
 * authorization: every data read and Server Action resolves the viewer here
 * rather than trusting an id sent by the client.
 *
 * Reads the request (cookies), so callers must render behind <Suspense>.
 */
export const getViewer = cache(async (): Promise<Viewer> => {
  // Always request-time, including local mode (which reads no cookies).
  await connection();
  if (getEnv().mode === "local") {
    return { kind: "local", user: await ensureLocalUser() };
  }

  const session = await auth().api.getSession({ headers: await headers() });
  if (!session) return { kind: "anonymous", user: null };

  const { user } = session;
  const viewerUser: ViewerUser = {
    id: user.id,
    name: user.name,
    email: user.isAnonymous ? null : user.email,
    image: user.image ?? null,
  };
  return user.isAnonymous
    ? { kind: "guest", user: viewerUser }
    : { kind: "user", user: viewerUser };
});

/** Viewer that is allowed to read and write saved data, or null. */
export async function getOwner(): Promise<ViewerUser | null> {
  const viewer = await getViewer();
  return viewer.user;
}
