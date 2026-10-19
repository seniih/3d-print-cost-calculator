import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { QuoteFonts } from "./pdf";

/**
 * Noto Sans (SIL OFL), trimmed to Latin plus currency signs: covers Turkish
 * letters and ₺. The files ship with the standalone build through
 * `outputFileTracingIncludes` in next.config.ts.
 */
let cached: Promise<QuoteFonts> | undefined;

export function loadQuoteFonts(): Promise<QuoteFonts> {
  cached ??= (async () => {
    const dir = path.join(process.cwd(), "assets", "fonts");
    const [regular, bold] = await Promise.all([
      readFile(path.join(dir, "NotoSans-400Regular.ttf")),
      readFile(path.join(dir, "NotoSans-700Bold.ttf")),
    ]);
    return { regular, bold };
  })();
  return cached;
}
