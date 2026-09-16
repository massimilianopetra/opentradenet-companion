export interface Candle {
  time: number; // unix seconds, UTC
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = "15m" | "1h" | "1d" | "1w";

export const TIMEFRAMES: Timeframe[] = ["15m", "1h", "1d", "1w"];

const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  "15m": 15 * 60,
  "1h": 60 * 60,
  "1d": 24 * 60 * 60,
  "1w": 7 * 24 * 60 * 60,
};

/** Data on disk is only ever 15m resolution; coarser timeframes are aggregated from it. */
function bucketStart(time: number, timeframe: Timeframe): number {
  const size = TIMEFRAME_SECONDS[timeframe];
  if (timeframe !== "1w") {
    return Math.floor(time / size) * size;
  }
  // Weeks start Monday 00:00 UTC.
  const dayStart = Math.floor(time / 86400) * 86400;
  const dayOfWeek = (new Date(dayStart * 1000).getUTCDay() + 6) % 7; // 0 = Monday
  return dayStart - dayOfWeek * 86400;
}

export function aggregateCandles(
  candles: Candle[],
  timeframe: Timeframe
): Candle[] {
  if (timeframe === "15m") return candles;

  const buckets = new Map<number, Candle>();
  for (const candle of candles) {
    const bucketTime = bucketStart(candle.time, timeframe);
    const existing = buckets.get(bucketTime);
    if (!existing) {
      buckets.set(bucketTime, { ...candle, time: bucketTime });
    } else {
      existing.high = Math.max(existing.high, candle.high);
      existing.low = Math.min(existing.low, candle.low);
      existing.close = candle.close;
      existing.volume += candle.volume;
    }
  }

  return [...buckets.values()].sort((a, b) => a.time - b.time);
}
