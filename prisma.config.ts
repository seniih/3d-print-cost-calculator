import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // `prisma generate` does not need a database, so a missing URL is allowed
    // here (e.g. during `docker build`). Commands that touch the database
    // (`migrate`, `studio`) will fail with a clear connection error instead.
    url: process.env.DATABASE_URL ?? "",
  },
});
