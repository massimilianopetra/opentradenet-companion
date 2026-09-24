import type { Candle } from "./candles";
import { linearRegressionChannel } from "./indicators";

/** Regression windows offered by the page (same presets as the chart's LR tool). */
export const TREND_BAR_OPTIONS = [50, 100, 240, 500] as const;
export const DEFAULT_TREND_BARS = 240;
/** Fewer candles than this (or than half the requested window) and the fit is too noisy to rank. */
export const MIN_TREND_BARS = 20;

export interface TrendRow {
  symbol: string;
  name?: string;
  /** Slope of the regression line as % of the window's mean close, per candle. */
  slopePercent: number;
  /** Change of the regression line across the whole window, in %. */
  windowPercent: number;
  /** Coefficient of determination (0–1): how cleanly price follows the line. */
  r2: number;
  /** Last close vs the regression line, in standard deviations of the residuals. */
  channelSigma: number;
  /** Candles actually used (short histories use fewer than requested). */
  bars: number;
  lastPrice: number;
}

export type TrendStats = Omit<TrendRow, "symbol" | "name">;

export function computeTrendStats(
  candles: Candle[],
  bars: number
): TrendStats | null {
  const closes = candles.map((c) => c.close);
  const n = closes.length;
  const count = Math.min(bars, n);
  if (count < Math.max(MIN_TREND_BARS, Math.ceil(bars / 2))) return null;

  const { mid, upper, slopePercent } = linearRegressionChannel(closes, count);
  const last = n - 1;
  const first = n - count;
  const fitLast = mid[last];
  const fitFirst = mid[first];
  const band = upper[last];
  if (slopePercent == null || fitLast == null || fitFirst == null || band == null) {
    return null;
  }

  let mean = 0;
  for (let i = first; i < n; i++) mean += closes[i];
  mean /= count;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = first; i < n; i++) {
    const fit = mid[i] as number;
    ssRes += (closes[i] - fit) ** 2;
    ssTot += (closes[i] - mean) ** 2;
  }

  // The channel is fit ± 2σ, so σ is half the band width.
  const std = (band - fitLast) / 2;

  return {
    slopePercent,
    windowPercent: fitFirst !== 0 ? ((fitLast - fitFirst) / fitFirst) * 100 : 0,
    r2: ssTot > 0 ? 1 - ssRes / ssTot : 0,
    channelSigma: std > 0 ? (closes[last] - fitLast) / std : 0,
    bars: count,
    lastPrice: closes[last],
  };
}
