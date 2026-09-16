import { readFile } from "node:fs/promises";
import path from "node:path";
import { assertValidSymbol, getDataDir } from "./dataDir";
import type { Candle } from "./candles";

/** Bot stores timestamps as naive "YYYY-MM-DD HH:MM:SS" strings in UTC. */
function parseTimestamp(timestamp: string): number {
  const iso = `${timestamp.replace(" ", "T")}Z`;
  return Math.floor(Date.parse(iso) / 1000);
}

export async function readCandles(symbol: string): Promise<Candle[]> {
  assertValidSymbol(symbol);
  const filePath = path.join(
    getDataDir(),
    "candles",
    symbol,
    `${symbol}_15m.csv`
  );

  const raw = await readFile(filePath, "utf8");
  const lines = raw.split("\n");
  const candles: Candle[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const [timestamp, open, high, low, close, volume] = line.split(",");
    candles.push({
      time: parseTimestamp(timestamp),
      open: Number(open),
      high: Number(high),
      low: Number(low),
      close: Number(close),
      volume: Number(volume),
    });
  }

  return candles;
}
