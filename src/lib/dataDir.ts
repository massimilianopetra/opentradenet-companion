import path from "node:path";

const SYMBOL_RE = /^[A-Za-z0-9_-]+$/;

export function getDataDir(): string {
  const dir = process.env.OPENTRADENET_DATA_DIR;
  if (!dir) {
    throw new Error("OPENTRADENET_DATA_DIR is not set (check .env)");
  }
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), dir);
}

export function assertValidSymbol(symbol: string): void {
  if (!SYMBOL_RE.test(symbol)) {
    throw new Error(`Invalid symbol: ${symbol}`);
  }
}
