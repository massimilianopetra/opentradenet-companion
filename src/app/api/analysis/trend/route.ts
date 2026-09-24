import { NextResponse } from "next/server";
import {
  listCandleSymbols,
  readSymbolSeries,
  seriesCandles,
} from "@/lib/analysisData";
import {
  ANALYSIS_TIMEFRAMES,
  isAnalysisTimeframe,
} from "@/lib/analysisTimeframes";
import { readSymbolsInfo } from "@/lib/symbolInfoServer";
import { splitDescription } from "@/lib/symbolInfo";
import {
  computeTrendStats,
  DEFAULT_TREND_BARS,
  TREND_BAR_OPTIONS,
  type TrendRow,
} from "@/lib/trendAnalysis";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const tf = params.get("tf") ?? "1h";
  if (!isAnalysisTimeframe(tf)) {
    return NextResponse.json(
      { error: `tf must be one of ${ANALYSIS_TIMEFRAMES.join(", ")}` },
      { status: 400 }
    );
  }
  const bars = Number(params.get("bars") ?? DEFAULT_TREND_BARS);
  if (!(TREND_BAR_OPTIONS as readonly number[]).includes(bars)) {
    return NextResponse.json(
      { error: `bars must be one of ${TREND_BAR_OPTIONS.join(", ")}` },
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
    symbols.map(async (symbol): Promise<TrendRow | null> => {
      try {
        const series = await readSymbolSeries(symbol);
        if (!series) return null;
        const stats = computeTrendStats(seriesCandles(series, tf), bars);
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
    bars,
    rows: rows
      .filter((r): r is TrendRow => r !== null)
      .sort((a, b) => b.slopePercent - a.slopePercent),
  });
}
