import { NextResponse } from "next/server";
import { readCandles } from "@/lib/candles";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/candles/[symbol]">
) {
  const { symbol } = await ctx.params;
  const upper = symbol.toUpperCase();

  try {
    const candles = await readCandles(upper);
    return NextResponse.json({ symbol: upper, candles });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
