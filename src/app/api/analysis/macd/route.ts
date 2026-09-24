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
import { computeMacdStats, type MacdRow } from "@/lib/macdAnalysis";

export async function GET(request: Request) {
  const tf = new URL(request.url).searchParams.get("tf") ?? "1h";
  if (!isAnalysisTimeframe(tf)) {
    return NextResponse.json(
      { error: `tf must be one of ${ANALYSIS_TIMEFRAMES.join(", ")}` },
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
    symbols.map(async (symbol): Promise<MacdRow | null> => {
      try {
        const series = await readSymbolSeries(symbol);
        if (!series) return null;
        const stats = computeMacdStats(seriesCandles(series, tf));
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
    rows: rows
      .filter((r): r is MacdRow => r !== null)
      .sort((a, b) => b.histPercent - a.histPercent),
  });
}
