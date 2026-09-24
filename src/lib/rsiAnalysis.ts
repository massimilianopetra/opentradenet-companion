import type { Candle } from "./candles";
import { rsi } from "./indicators";

export const RSI_TIMEFRAMES = ["15m", "1h", "1d"] as const;
export type RsiTimeframe = (typeof RSI_TIMEFRAMES)[number];

export const RSI_OVERBOUGHT = 70;
export const RSI_OVERSOLD = 30;

export type RsiZone = "overbought" | "oversold" | "neutral";

export interface RsiRow {
  symbol: string;
  name?: string;
  /** RSI of the latest (possibly still forming) candle. */
  rsi: number;
  /** rsi − RSI of the previous candle. */
  delta: number;
  zone: RsiZone;
  /** Consecutive candles (including the latest) spent in the current zone. */
  streak: number;
  lastPrice: number;
}

export type RsiStats = Omit<RsiRow, "symbol" | "name">;

export function rsiZone(value: number): RsiZone {
  if (value >= RSI_OVERBOUGHT) return "overbought";
  if (value <= RSI_OVERSOLD) return "oversold";
  return "neutral";
}

export function computeRsiStats(
  candles: Candle[],
  period: number
): RsiStats | null {
  const values = rsi(
    candles.map((c) => c.close),
    period
  );
  const last = values.length - 1;
  const current = values[last];
  const previous = values[last - 1];
  if (current == null || previous == null) return null;

  const zone = rsiZone(current);
  let streak = 0;
  for (let i = last; i >= 0; i--) {
    const v = values[i];
    if (v == null || rsiZone(v) !== zone) break;
    streak++;
  }

  return {
    rsi: current,
    delta: current - previous,
    zone,
    streak,
    lastPrice: candles[candles.length - 1].close,
  };
}
