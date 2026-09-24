import { NextResponse } from "next/server";
import { listCandleSymbols, readSymbolSeries } from "@/lib/analysisData";
import { readSymbolsInfo } from "@/lib/symbolInfoServer";
import { splitDescription } from "@/lib/symbolInfo";
import { computeVolatility, type VolatilityRow } from "@/lib/volatility";

const MAX_DAYS = 365;

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
    symbols.map(async (symbol): Promise<VolatilityRow | null> => {
      try {
        const series = await readSymbolSeries(symbol);
        if (!series) return null;
        const stats = computeVolatility(
          series.completeDaily,
          daysParam,
          series.lastPrice
        );
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

  const valid = rows
    .filter((r): r is VolatilityRow => r !== null)
    .sort((a, b) => b.bodyAvg - a.bodyAvg);

  // Headline range: the most recent last day, and the earliest start among
  // the symbols that end on it (shorter histories start later).
  const to = Math.max(...valid.map((r) => r.toTime));
  const from = Math.min(
    ...valid.filter((r) => r.toTime === to).map((r) => r.fromTime)
  );

  return NextResponse.json({
    days: daysParam,
    range: valid.length > 0 ? { from, to } : null,
    rows: valid,
  });
}
