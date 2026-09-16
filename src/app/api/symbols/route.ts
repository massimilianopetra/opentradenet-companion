import { readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getDataDir } from "@/lib/dataDir";
import { readLatestPriceChange } from "@/lib/prices";
import { readSymbolsInfo } from "@/lib/symbolInfoServer";
import { readFavorites } from "@/lib/favoritesStore";

export interface SymbolSummary {
  symbol: string;
  description?: string;
  assetType?: string;
  price: number | null;
  changePercent: number | null;
  favorite: boolean;
}

export async function GET() {
  const dataDir = getDataDir();

  let entries;
  try {
    entries = await readdir(path.join(dataDir, "candles"), {
      withFileTypes: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Cannot read candles directory: ${message}` },
      { status: 500 }
    );
  }

  const symbols = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const [info, favorites] = await Promise.all([
    readSymbolsInfo(),
    readFavorites(),
  ]);
  const favoriteSet = new Set(favorites);

  const result: SymbolSummary[] = await Promise.all(
    symbols.map(async (symbol) => {
      const priceChange = await readLatestPriceChange(symbol);
      return {
        symbol,
        description: info[symbol]?.description,
        assetType: info[symbol]?.asset_type,
        price: priceChange?.price ?? null,
        changePercent: priceChange?.changePercent ?? null,
        favorite: favoriteSet.has(symbol),
      };
    })
  );

  return NextResponse.json(result);
}
