import fs from "node:fs";
import path from "node:path";

const SYMBOL_RE = /^[A-Za-z0-9_-]+$/;

export function getDataDir(): string {
  const dir = process.env.OPENTRADENET_DATA_DIR;
  if (!dir) {
    logEnvDiagnostics();
    throw new Error("OPENTRADENET_DATA_DIR is not set (check .env)");
  }
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), dir);
}

/**
 * Fires only when OPENTRADENET_DATA_DIR is missing — prints exactly what
 * Node sees on disk (cwd, which env files exist, their raw first bytes) to
 * the process log (journalctl on the systemd deploy), since "the file is
 * there" and "Node actually loaded it" are two different claims and this
 * is how you tell them apart without SSH-ing in to poke around by hand.
 */
function logEnvDiagnostics(): void {
  const cwd = process.cwd();
  console.error(`[dataDir] OPENTRADENET_DATA_DIR is not set. cwd=${cwd}`);
  console.error(
    `[dataDir] NODE_ENV=${process.env.NODE_ENV ?? "(unset)"}`
  );

  for (const filename of [
    ".env",
    ".env.local",
    ".env.production",
    ".env.production.local",
  ]) {
    const filePath = path.join(/* turbopackIgnore: true */ cwd, filename);
    try {
      const buf = fs.readFileSync(filePath);
      const hexPreview = buf.subarray(0, 24).toString("hex");
      const textPreview = buf.subarray(0, 80).toString("utf8").replace(/\n/g, "\\n");
      console.error(
        `[dataDir] ${filePath}: ${buf.length} bytes, first bytes (hex)=${hexPreview}, as utf8="${textPreview}"`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[dataDir] ${filePath}: not readable (${message})`);
    }
  }
}

export function assertValidSymbol(symbol: string): void {
  if (!SYMBOL_RE.test(symbol)) {
    throw new Error(`Invalid symbol: ${symbol}`);
  }
}
