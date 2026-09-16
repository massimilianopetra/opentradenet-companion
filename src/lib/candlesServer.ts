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

export interface CandleChange {
  price: number | null;
  changePercent: number | null;
}

/**
 * Derives current price and % change from the last `periods` 15m candles
 * (default 96 = 24h) instead of the coarser data/prices/{SYMBOL}.csv snapshots,
 * which are recorded at irregular intervals.
 */
export async function readLatestCandleChange(
  symbol: string,
  periods = 96
): Promise<CandleChange | null> {
  assertValidSymbol(symbol);
  const filePath = path.join(
    getDataDir(),
    "candles",
    symbol,
    `${symbol}_15m.csv`
  );

  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch {
    return null;
  }

  const rows = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(1); // drop header

  if (rows.length === 0) return null;

  const closeOf = (row: string) => Number(row.split(",")[4]);
  const price = closeOf(rows[rows.length - 1]);

  const compareIndex = rows.length - 1 - periods;
  if (compareIndex < 0) {
    return { price, changePercent: null };
  }

  const previousPrice = closeOf(rows[compareIndex]);
  const changePercent =
    previousPrice !== 0 ? ((price - previousPrice) / previousPrice) * 100 : null;

  return { price, changePercent };
}
