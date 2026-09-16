import { readFile } from "node:fs/promises";
import path from "node:path";
import { getDataDir } from "./dataDir";
import type { SymbolInfo } from "./symbolInfo";

export async function readSymbolsInfo(): Promise<Record<string, SymbolInfo>> {
  try {
    const raw = await readFile(
      path.join(getDataDir(), "symbols_info.json"),
      "utf8"
    );
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
