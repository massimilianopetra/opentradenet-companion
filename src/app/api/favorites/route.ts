import { NextResponse } from "next/server";
import { readFavorites } from "@/lib/favoritesStore";

export async function GET() {
  const favorites = await readFavorites();
  return NextResponse.json(favorites);
}
