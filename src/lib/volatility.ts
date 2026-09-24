import { aggregateCandles, type Candle } from "./candles";

export interface VolatilityRow {
  symbol: string;
  name?: string;
  /** Number of complete daily candles actually used (≤ requested days). */
  days: number;
  /** Mean of |close − open| / open, in %. */
  bodyAvg: number;
  /** Largest single-day |close − open| / open, in %. */
  bodyMax: number;
  /** Mean of (high − low) / open, in %. */
  rangeAvg: number;
  /** Share of days that closed above the open, in %. */
  upDaysPercent: number;
  /** Signed (close − open) / open of the most recent complete day, in %. */
  lastBody: number;
  lastPrice: number;
  /** Start (unix seconds, UTC midnight) of the first and last day used. */
  fromTime: number;
  toTime: number;
}

export type VolatilityStats = Omit<VolatilityRow, "symbol" | "name">;

const DAY = 86400;
const CANDLE_15M = 15 * 60;

/**
 * Complete UTC daily candles aggregated from the bot's 15m candles. The last
 * day is dropped if its final 15m candle (23:45) isn't on disk yet, so a
 * half-finished day doesn't drag the averages down.
 */
export function completeDailyCandles(candles: Candle[]): Candle[] {
  if (candles.length === 0) return [];
  const daily = aggregateCandles(candles, "1d").filter((c) => c.open > 0);
  const lastTime = candles[candles.length - 1].time;
  const lastDay = daily[daily.length - 1];
  if (lastDay && lastTime + CANDLE_15M < lastDay.time + DAY) daily.pop();
  return daily;
}

/** Daily open→close volatility over the last `days` complete days. */
export function computeVolatility(
  daily: Candle[],
  days: number,
  lastPrice: number
): VolatilityStats | null {
  const window = daily.slice(-days);
  if (window.length === 0) return null;

  let bodySum = 0;
  let bodyMax = 0;
  let rangeSum = 0;
  let upDays = 0;
  for (const c of window) {
    const body = (Math.abs(c.close - c.open) / c.open) * 100;
    bodySum += body;
    bodyMax = Math.max(bodyMax, body);
    rangeSum += ((c.high - c.low) / c.open) * 100;
    if (c.close > c.open) upDays++;
  }

  const last = window[window.length - 1];
  return {
    days: window.length,
    bodyAvg: bodySum / window.length,
    bodyMax,
    rangeAvg: rangeSum / window.length,
    upDaysPercent: (upDays / window.length) * 100,
    lastBody: ((last.close - last.open) / last.open) * 100,
    lastPrice,
    fromTime: window[0].time,
    toTime: last.time,
  };
}
