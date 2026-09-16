import { NextResponse } from "next/server";
import { readSymbolsInfo } from "@/lib/symbolInfoServer";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/symbols/[symbol]">
) {
  const { symbol } = await ctx.params;
  const upper = symbol.toUpperCase();

  const info = await readSymbolsInfo();

  return NextResponse.json({ symbol: upper, info: info[upper] ?? null });
}
