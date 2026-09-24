import Link from "next/link";
import type { Timeframe } from "@/lib/candles";
import styles from "./ChartLink.module.css";

/** Small chart icon that deep-links to /charts for a symbol + timeframe. */
export default function ChartLink({
  symbol,
  timeframe,
}: {
  symbol: string;
  timeframe: Timeframe;
}) {
  const label = `Apri il grafico ${timeframe} di ${symbol}`;
  return (
    <Link
      href={`/charts?symbol=${encodeURIComponent(symbol)}&tf=${timeframe}`}
      className={styles.link}
      title={label}
      aria-label={label}
    >
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path
          d="M2 2v12h12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4.5 10.5 7.5 7l2 2 4-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}
