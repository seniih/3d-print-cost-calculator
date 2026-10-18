import { connection } from "next/server";
import { db } from "@/lib/db";

/** Liveness + database check, used by Docker's healthcheck. */
export async function GET() {
  await connection();
  try {
    await db().$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "error", database: "unreachable" }, { status: 503 });
  }
}
