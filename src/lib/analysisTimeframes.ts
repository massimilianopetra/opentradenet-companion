/** Timeframes offered by the per-candle analysis pages (RSI, MACD). */
export const ANALYSIS_TIMEFRAMES = ["15m", "1h", "1d"] as const;
export type AnalysisTimeframe = (typeof ANALYSIS_TIMEFRAMES)[number];

export function isAnalysisTimeframe(tf: string): tf is AnalysisTimeframe {
  return (ANALYSIS_TIMEFRAMES as readonly string[]).includes(tf);
}
