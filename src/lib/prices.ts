import { readFile } from "node:fs/promises";
import path from "node:path";
import { assertValidSymbol, getDataDir } from "./dataDir";

export interface PriceChange {
  date: string;
  price: number;
  previousPrice: number | null;
  changePercent: number | null;
}

/** Reads the last two rows of data/prices/{SYMBOL}.csv to derive day-over-day change. */
export async function readLatestPriceChange(
  symbol: string
): Promise<PriceChange | null> {
  assertValidSymbol(symbol);
  const filePath = path.join(getDataDir(), "prices", `${symbol}.csv`);

  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch {
    return null;
  }

  const rows = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(1); // drop header

  if (rows.length === 0) return null;

  const [date, priceRaw] = rows[rows.length - 1].split(",");
  const price = Number(priceRaw);

  if (rows.length < 2) {
    return { date, price, previousPrice: null, changePercent: null };
  }

  const [, previousPriceRaw] = rows[rows.length - 2].split(",");
  const previousPrice = Number(previousPriceRaw);
  const changePercent =
    previousPrice !== 0 ? ((price - previousPrice) / previousPrice) * 100 : null;

  return { date, price, previousPrice, changePercent };
}
