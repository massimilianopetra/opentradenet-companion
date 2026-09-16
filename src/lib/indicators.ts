/**
 * Mirrors the indicator math in opentradenet_bot/candle_chart.py (_ema,
 * _linear_regression_channel, _macd) so the webapp's overlays match the
 * bot's /chart command exactly, computed here in TS against whatever
 * timeframe is currently displayed (15m/1h/1d/1w).
 */

export function ema(closes: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(closes.length).fill(null);
  const start = period - 1;
  if (start >= closes.length) return out;

  const k = 2 / (period + 1);
  let seed = 0;
  for (let i = 0; i < period; i++) seed += closes[i];
  out[start] = seed / period;

  for (let i = start + 1; i < closes.length; i++) {
    out[i] = closes[i] * k + (out[i - 1] as number) * (1 - k);
  }
  return out;
}

export interface RegressionChannel {
  mid: (number | null)[];
  upper: (number | null)[];
  lower: (number | null)[];
}

/** Least-squares linear regression over the last `bars` closes (default: all of them). */
export function linearRegressionChannel(
  closes: number[],
  bars?: number,
  k = 2.0
): RegressionChannel {
  const n = closes.length;
  const mid: (number | null)[] = new Array(n).fill(null);
  const upper: (number | null)[] = new Array(n).fill(null);
  const lower: (number | null)[] = new Array(n).fill(null);

  const window = bars ?? n;
  const start = Math.max(0, n - window);
  const count = n - start;
  if (count < 2) return { mid, upper, lower };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = start; i < n; i++) {
    sumX += i;
    sumY += closes[i];
    sumXY += i * closes[i];
    sumXX += i * i;
  }
  const slope = (count * sumXY - sumX * sumY) / (count * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / count;

  let sumSqResiduals = 0;
  for (let i = start; i < n; i++) {
    const fit = slope * i + intercept;
    const residual = closes[i] - fit;
    sumSqResiduals += residual * residual;
  }
  const std = Math.sqrt(sumSqResiduals / count);

  for (let i = start; i < n; i++) {
    const fit = slope * i + intercept;
    mid[i] = fit;
    upper[i] = fit + k * std;
    lower[i] = fit - k * std;
  }

  return { mid, upper, lower };
}

export interface Macd {
  macdLine: (number | null)[];
  signalLine: (number | null)[];
  histogram: (number | null)[];
}

/**
 * MACD = EMA(fast) - EMA(slow); signal = EMA(signal period) of the MACD
 * line's valid values, compacted then scattered back — mirrors _macd's
 * "operate on the valid subset" approach exactly (rather than seeding the
 * signal EMA from a run of leading NaNs).
 */
export function macd(
  closes: number[],
  fast = 12,
  slow = 26,
  signal = 9
): Macd {
  const n = closes.length;
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);

  const macdLine: (number | null)[] = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (emaFast[i] != null && emaSlow[i] != null) {
      macdLine[i] = (emaFast[i] as number) - (emaSlow[i] as number);
    }
  }

  const validIdx: number[] = [];
  const validValues: number[] = [];
  for (let i = 0; i < n; i++) {
    if (macdLine[i] != null) {
      validIdx.push(i);
      validValues.push(macdLine[i] as number);
    }
  }

  const signalLine: (number | null)[] = new Array(n).fill(null);
  if (validIdx.length >= signal) {
    const tmp = ema(validValues, signal);
    for (let j = 0; j < validIdx.length; j++) {
      if (tmp[j] != null) signalLine[validIdx[j]] = tmp[j];
    }
  }

  const histogram: (number | null)[] = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (macdLine[i] != null && signalLine[i] != null) {
      histogram[i] = (macdLine[i] as number) - (signalLine[i] as number);
    }
  }

  return { macdLine, signalLine, histogram };
}
