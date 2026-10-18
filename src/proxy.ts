import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

/**
 * Sends visitors without a locale in the URL to /en or /tr, based on their
 * saved choice or browser language.
 */
export default createMiddleware(routing);

export const config = {
  // Skip API routes, Next.js internals and anything that looks like a file.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
