import { NextResponse } from "next/server";
import { listCandleSymbols, readSymbolSeries } from "@/lib/analysisData";
import { readSymbolsInfo } from "@/lib/symbolInfoServer";
import { splitDescription } from "@/lib/symbolInfo";
import {
  RSI_TIMEFRAMES,
  computeRsiStats,
  type RsiRow,
  type RsiTimeframe,
} from "@/lib/rsiAnalysis";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const tf = (params.get("tf") ?? "1h") as RsiTimeframe;
  const period = Number(params.get("period") ?? "14");

  if (!RSI_TIMEFRAMES.includes(tf)) {
    return NextResponse.json(
      { error: `tf must be one of ${RSI_TIMEFRAMES.join(", ")}` },
      { status: 400 }
    );
  }
  if (!Number.isInteger(period) || period < 2 || period > 100) {
    return NextResponse.json(
      { error: "period must be an integer between 2 and 100" },
      { status: 400 }
    );
  }

  let symbols: string[];
  try {
    symbols = await listCandleSymbols();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Cannot read candles directory: ${message}` },
      { status: 500 }
    );
  }

  const info = await readSymbolsInfo();

  const rows = await Promise.all(
    symbols.map(async (symbol): Promise<RsiRow | null> => {
      try {
        const series = await readSymbolSeries(symbol);
        if (!series) return null;
        const candles =
          tf === "15m"
            ? series.recent15m
            : tf === "1h"
              ? series.hourly
              : series.daily;
        const stats = computeRsiStats(candles, period);
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
    tf,
    period,
    rows: rows
      .filter((r): r is RsiRow => r !== null)
      .sort((a, b) => b.rsi - a.rsi),
  });
}
