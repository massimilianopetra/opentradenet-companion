import { NextResponse } from "next/server";
import { addFavorite, removeFavorite } from "@/lib/favoritesStore";

export async function PUT(
  _request: Request,
  ctx: RouteContext<"/api/favorites/[symbol]">
) {
  const { symbol } = await ctx.params;
  try {
    const favorites = await addFavorite(symbol.toUpperCase());
    return NextResponse.json(favorites);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/favorites/[symbol]">
) {
  const { symbol } = await ctx.params;
  try {
    const favorites = await removeFavorite(symbol.toUpperCase());
    return NextResponse.json(favorites);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
