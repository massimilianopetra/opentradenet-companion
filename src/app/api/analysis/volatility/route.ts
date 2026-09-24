import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import type { Candle } from "@/lib/candles";
import { getDataDir } from "@/lib/dataDir";
import { readCandles } from "@/lib/candlesServer";
import { readSymbolsInfo } from "@/lib/symbolInfoServer";
import { splitDescription } from "@/lib/symbolInfo";
import {
  completeDailyCandles,
  computeVolatility,
  type VolatilityRow,
} from "@/lib/volatility";

const MAX_DAYS = 365;

interface DailyCacheEntry {
  mtimeMs: number;
  daily: Candle[];
  lastPrice: number;
}

/**
 * Parsing every symbol's full 15m CSV takes seconds; the daily aggregate is
 * tiny, so keep it per symbol and only re-read a file when the bot rewrites it.
 */
const dailyCache = new Map<string, DailyCacheEntry>();

async function readDaily(symbol: string): Promise<DailyCacheEntry | null> {
  const filePath = path.join(
    getDataDir(),
    "candles",
    symbol,
    `${symbol}_15m.csv`
  );
  const { mtimeMs } = await stat(filePath);
  const cached = dailyCache.get(symbol);
  if (cached && cached.mtimeMs === mtimeMs) return cached;

  const candles = await readCandles(symbol);
  if (candles.length === 0) return null;
  const entry: DailyCacheEntry = {
    mtimeMs,
    daily: completeDailyCandles(candles),
    lastPrice: candles[candles.length - 1].close,
  };
  dailyCache.set(symbol, entry);
  return entry;
}

export async function GET(request: Request) {
  const daysParam = Number(
    new URL(request.url).searchParams.get("days") ?? "20"
  );
  if (!Number.isInteger(daysParam) || daysParam < 1 || daysParam > MAX_DAYS) {
    return NextResponse.json(
      { error: `days must be an integer between 1 and ${MAX_DAYS}` },
      { status: 400 }
    );
  }

  let symbols: string[];
  try {
    const entries = await readdir(path.join(getDataDir(), "candles"), {
      withFileTypes: true,
    });
    symbols = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Cannot read candles directory: ${message}` },
      { status: 500 }
    );
  }

  const info = await readSymbolsInfo();

  const rows = await Promise.all(
    symbols.map(async (symbol): Promise<VolatilityRow | null> => {
      try {
        const entry = await readDaily(symbol);
        if (!entry) return null;
        const stats = computeVolatility(entry.daily, daysParam, entry.lastPrice);
        if (!stats) return null;
        return {
          symbol,
          name: splitDescription(info[symbol]?.description)?.name,
          ...stats,
        };
      } catch {
        return null;
      }
    })
  );

  return NextResponse.json({
    days: daysParam,
    rows: rows
      .filter((r): r is VolatilityRow => r !== null)
      .sort((a, b) => b.bodyAvg - a.bodyAvg),
  });
}
