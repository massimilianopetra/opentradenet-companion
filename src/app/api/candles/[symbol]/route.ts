import { NextResponse } from "next/server";
import { TIMEFRAMES, aggregateCandles, type Timeframe } from "@/lib/candles";
import { readCandles } from "@/lib/candlesServer";

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/candles/[symbol]">
) {
  const { symbol } = await ctx.params;
  const upper = symbol.toUpperCase();

  const tfParam = new URL(request.url).searchParams.get("tf") ?? "15m";
  if (!TIMEFRAMES.includes(tfParam as Timeframe)) {
    return NextResponse.json(
      { error: `Invalid timeframe: ${tfParam}` },
      { status: 400 }
    );
  }
  const timeframe = tfParam as Timeframe;

  try {
    const candles = await readCandles(upper);
    return NextResponse.json({
      symbol: upper,
      timeframe,
      candles: aggregateCandles(candles, timeframe),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
