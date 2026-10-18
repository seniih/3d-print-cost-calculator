import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth/server";

// Resolve the auth instance per request so builds don't need runtime secrets.
export async function GET(request: Request) {
  return toNextJsHandler(auth()).GET(request);
}

export async function POST(request: Request) {
  return toNextJsHandler(auth()).POST(request);
}
