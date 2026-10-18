"use client";

import { createAuthClient } from "better-auth/react";
import { anonymousClient } from "better-auth/client/plugins";

/** Browser-side auth client. Talks to /api/auth on the same origin. */
export const authClient = createAuthClient({
  plugins: [anonymousClient()],
});
