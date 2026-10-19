import { unzipSync, strFromU8 } from "fflate";
import { parseGcode, parseSliceInfoXml, type SliceInfo } from "./parse";

/** How much of each end of a G-code file to read: slicers keep their summary within this. */
const EDGE_BYTES = 256 * 1024;
const MAX_3MF_BYTES = 300 * 1024 * 1024;
const MAX_GCODE_BYTES = 2 * 1024 * 1024 * 1024;

export type ReadError =
  | "unsupported" // not a file type we read
  | "binaryGcode" // PrusaSlicer's .bgcode
  | "tooLarge"
  | "unreadable" // damaged zip, not text, …
  | "noData" // a G-code file without a slicer summary
  | "unsliced3mf"; // a 3MF that is only a model

export type ReadResult = { ok: true; info: SliceInfo } | { ok: false; error: ReadError };

const GCODE = /\.(gcode|gco|gc|g|nc)$/i;

/** Reads a G-code or 3MF file the user picked. Runs in the browser; nothing is uploaded. */
export async function readSliceFile(file: File): Promise<ReadResult> {
  const name = file.name.toLowerCase();
  try {
    if (name.endsWith(".bgcode")) return { ok: false, error: "binaryGcode" };
    if (name.endsWith(".3mf")) return await read3mf(file);
    if (GCODE.test(name)) return await readGcode(file);
    return { ok: false, error: "unsupported" };
  } catch {
    return { ok: false, error: "unreadable" };
  }
}

async function readGcode(file: File): Promise<ReadResult> {
  if (file.size > MAX_GCODE_BYTES) return { ok: false, error: "tooLarge" };
  const head = await file.slice(0, EDGE_BYTES).text();
  const tail = file.size > EDGE_BYTES ? await file.slice(file.size - EDGE_BYTES).text() : head;
  // A binary file decodes to a lot of replacement characters.
  if ((head.match(/�/g)?.length ?? 0) > 20) return { ok: false, error: "unreadable" };
  return finish(parseGcode(head, tail));
}

async function read3mf(file: File): Promise<ReadResult> {
  if (file.size > MAX_3MF_BYTES) return { ok: false, error: "tooLarge" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  // Decompress only what we use: a 3MF can hold large thumbnails and models.
  const wanted = (n: string) => /(^|\/)slice_info\.config$/i.test(n) || /\.gcode$/i.test(n);
  const files = unzipSync(bytes, { filter: (f) => wanted(f.name) });

  const xmlName = Object.keys(files).find((n) => /slice_info\.config$/i.test(n));
  if (xmlName) {
    const info = parseSliceInfoXml(strFromU8(files[xmlName]));
    if (info) return finish(info);
  }
  const gcodeName = Object.keys(files).find((n) => /\.gcode$/i.test(n));
  if (gcodeName) {
    const text = strFromU8(files[gcodeName]);
    const edge = text.length > EDGE_BYTES ? text.slice(-EDGE_BYTES) : text;
    return finish(parseGcode(text.slice(0, EDGE_BYTES), edge));
  }
  return { ok: false, error: "unsliced3mf" };
}

function finish(info: SliceInfo): ReadResult {
  if (info.printSeconds === null && info.filaments.length === 0) {
    return { ok: false, error: "noData" };
  }
  return { ok: true, info };
}
