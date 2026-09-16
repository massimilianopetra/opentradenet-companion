import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertValidSymbol } from "./dataDir";

/**
 * Favorites are local companion-app preferences, not bot data — stored under
 * this project's own `data/` directory (never OPENTRADENET_DATA_DIR, which is
 * the bot's read-only directory).
 */
const FAVORITES_FILE = path.join(process.cwd(), "data", "favorites.json");

export async function readFavorites(): Promise<string[]> {
  try {
    const raw = await readFile(FAVORITES_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeFavorites(favorites: string[]): Promise<void> {
  await mkdir(path.dirname(FAVORITES_FILE), { recursive: true });
  await writeFile(FAVORITES_FILE, JSON.stringify(favorites, null, 2));
}

export async function addFavorite(symbol: string): Promise<string[]> {
  assertValidSymbol(symbol);
  const favorites = await readFavorites();
  if (!favorites.includes(symbol)) {
    favorites.push(symbol);
    favorites.sort();
    await writeFavorites(favorites);
  }
  return favorites;
}

export async function removeFavorite(symbol: string): Promise<string[]> {
  assertValidSymbol(symbol);
  const favorites = (await readFavorites()).filter((s) => s !== symbol);
  await writeFavorites(favorites);
  return favorites;
}
