"use client";

import { TIMEFRAMES, type Timeframe } from "@/lib/candles";
import styles from "./TimeframeSelector.module.css";

export default function TimeframeSelector({
  value,
  onChange,
}: {
  value: Timeframe;
  onChange: (timeframe: Timeframe) => void;
}) {
  return (
    <div className={styles.group}>
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf}
          type="button"
          className={tf === value ? styles.active : styles.button}
          onClick={() => onChange(tf)}
        >
          {tf}
        </button>
      ))}
    </div>
  );
}
