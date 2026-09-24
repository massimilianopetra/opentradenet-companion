import type { Candle } from "./candles";
import { macd } from "./indicators";

export const MACD_FAST = 12;
export const MACD_SLOW = 26;
export const MACD_SIGNAL = 9;

export type MacdTrend = "bullish" | "bearish";

export interface MacdRow {
  symbol: string;
  name?: string;
  /** MACD − signal of the latest (possibly still forming) candle. */
  histogram: number;
  /**
   * Histogram as % of the last price, so it's comparable across symbols
   * (the raw MACD is in price units: BTC and EUR/USD would never line up).
   */
  histPercent: number;
  /** histPercent − the previous candle's: > 0 means momentum is building. */
  histDelta: number;
  /** MACD above the signal line. */
  trend: MacdTrend;
  /** Candles since MACD last crossed its signal (0 = on the latest candle). */
  crossAgo: number | null;
  /** MACD line above zero. */
  aboveZero: boolean;
  lastPrice: number;
}

export type MacdStats = Omit<MacdRow, "symbol" | "name">;

export function computeMacdStats(candles: Candle[]): MacdStats | null {
  const closes = candles.map((c) => c.close);
  const { macdLine, histogram } = macd(
    closes,
    MACD_FAST,
    MACD_SLOW,
    MACD_SIGNAL
  );
  const last = closes.length - 1;
  const hist = histogram[last];
  const prevHist = histogram[last - 1];
  const line = macdLine[last];
  const price = closes[last];
  if (hist == null || prevHist == null || line == null || !price) return null;

  let crossAgo: number | null = null;
  for (let i = last; i > 0; i--) {
    const h = histogram[i];
    const p = histogram[i - 1];
    if (h == null || p == null) break;
    if (h >= 0 !== p >= 0) {
      crossAgo = last - i;
      break;
    }
  }

  const histPercent = (hist / price) * 100;
  const prevPrice = closes[last - 1];
  const prevHistPercent = prevPrice ? (prevHist / prevPrice) * 100 : 0;

  return {
    histogram: hist,
    histPercent,
    histDelta: histPercent - prevHistPercent,
    trend: hist >= 0 ? "bullish" : "bearish",
    crossAgo,
    aboveZero: line > 0,
    lastPrice: price,
  };
}
