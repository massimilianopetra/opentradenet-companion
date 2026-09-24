import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { aggregateCandles, type Candle } from "./candles";
import { readCandles } from "./candlesServer";
import { getDataDir } from "./dataDir";
import type { AnalysisTimeframe } from "./analysisTimeframes";
import { completeDailyCandles } from "./volatility";

/** How many trailing 15m candles to keep — plenty for Wilder RSI to converge. */
const RECENT_15M = 500;

export interface SymbolSeries {
  mtimeMs: number;
  lastPrice: number;
  /** Last RECENT_15M raw 15m candles. */
  recent15m: Candle[];
  /** Full-history 1h and 1d aggregates, including the still-forming candle. */
  hourly: Candle[];
  daily: Candle[];
  /** Daily aggregates with the incomplete last day dropped. */
  completeDaily: Candle[];
}

/**
 * Parsing every symbol's full 15m CSV takes seconds; the aggregates are
 * small, so keep them per symbol and only re-read a file when the bot
 * rewrites it. Shared by all the /api/analysis/* routes.
 */
const cache = new Map<string, SymbolSeries>();

/** Candles for a per-candle analysis timeframe; the last one may be forming. */
export function seriesCandles(
  series: SymbolSeries,
  tf: AnalysisTimeframe
): Candle[] {
  if (tf === "15m") return series.recent15m;
  if (tf === "1h") return series.hourly;
  return series.daily;
}

export async function listCandleSymbols(): Promise<string[]> {
  const entries = await readdir(path.join(getDataDir(), "candles"), {
    withFileTypes: true,
  });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

export async function readSymbolSeries(
  symbol: string
): Promise<SymbolSeries | null> {
  const filePath = path.join(
    getDataDir(),
    "candles",
    symbol,
    `${symbol}_15m.csv`
  );
  const { mtimeMs } = await stat(filePath);
  const cached = cache.get(symbol);
  if (cached && cached.mtimeMs === mtimeMs) return cached;

  const candles = await readCandles(symbol);
  if (candles.length === 0) return null;
  const series: SymbolSeries = {
    mtimeMs,
    lastPrice: candles[candles.length - 1].close,
    recent15m: candles.slice(-RECENT_15M),
    hourly: aggregateCandles(candles, "1h"),
    daily: aggregateCandles(candles, "1d"),
    completeDaily: completeDailyCandles(candles),
  };
  cache.set(symbol, series);
  return series;
}
