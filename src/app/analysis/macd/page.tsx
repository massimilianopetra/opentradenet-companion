"use client";

import { useEffect, useMemo, useState } from "react";
import ChartLink from "@/components/ChartLink";
import {
  ANALYSIS_TIMEFRAMES,
  type AnalysisTimeframe,
} from "@/lib/analysisTimeframes";
import {
  MACD_FAST,
  MACD_SIGNAL,
  MACD_SLOW,
  type MacdRow,
} from "@/lib/macdAnalysis";
import styles from "../analysis.module.css";

/** A crossover within this many candles counts as "recent". */
const RECENT_CROSS = 3;

type SortKey = keyof Pick<
  MacdRow,
  "symbol" | "histPercent" | "histDelta" | "crossAgo" | "lastPrice"
>;
type Filter = "all" | "bullish" | "bearish" | "recentCross";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Tutti" },
  { key: "bullish", label: "Rialzisti" },
  { key: "bearish", label: "Ribassisti" },
  { key: "recentCross", label: `Incrocio ≤${RECENT_CROSS} candele` },
];

const COLUMNS: {
  key: SortKey | "trend" | "zero";
  label: string;
  title: string;
}[] = [
  { key: "symbol", label: "Simbolo", title: "" },
  {
    key: "histPercent",
    label: "Istogramma",
    title: "MACD − segnale, in % del prezzo (confrontabile tra simboli)",
  },
  {
    key: "histDelta",
    label: "Momentum",
    title: "Variazione dell'istogramma rispetto alla candela precedente",
  },
  {
    key: "trend",
    label: "Trend",
    title: "MACD sopra o sotto la linea di segnale",
  },
  {
    key: "crossAgo",
    label: "Ultimo incrocio",
    title: "Candele trascorse dall'ultimo incrocio MACD/segnale",
  },
  {
    key: "zero",
    label: "MACD vs 0",
    title: "Linea MACD sopra o sotto lo zero",
  },
  { key: "lastPrice", label: "Prezzo", title: "Ultimo prezzo" },
];

const matchesFilter = (r: MacdRow, filter: Filter) => {
  switch (filter) {
    case "bullish":
    case "bearish":
      return r.trend === filter;
    case "recentCross":
      return r.crossAgo != null && r.crossAgo <= RECENT_CROSS;
    default:
      return true;
  }
};

const crossLabel = (ago: number | null) => {
  if (ago == null) return "—";
  if (ago === 0) return "ora";
  return `${ago} ${ago === 1 ? "candela" : "candele"} fa`;
};

export default function MacdPage() {
  const [tf, setTf] = useState<AnalysisTimeframe>("1h");
  const [rows, setRows] = useState<MacdRow[]>([]);
  const [rowsFor, setRowsFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("histPercent");
  const [sortDesc, setSortDesc] = useState(true);
  const loading = rowsFor !== tf;

  useEffect(() => {
    let ignore = false;
    fetch(`/api/analysis/macd?tf=${tf}`)
      .then((res) => res.json())
      .then((data: { rows: MacdRow[] } | { error: string }) => {
        if (ignore) return;
        if ("error" in data) {
          setError(data.error);
          setRows([]);
        } else {
          setError(null);
          setRows(data.rows);
        }
        setRowsFor(tf);
      })
      .catch((err) => {
        if (ignore) return;
        setError(String(err));
        setRowsFor(tf);
      });
    return () => {
      ignore = true;
    };
  }, [tf]);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        FILTERS.map((f) => [
          f.key,
          rows.filter((r) => matchesFilter(r, f.key)).length,
        ])
      ) as Record<Filter, number>,
    [rows]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = rows.filter(
      (r) =>
        matchesFilter(r, filter) &&
        (!q ||
          r.symbol.toLowerCase().includes(q) ||
          r.name?.toLowerCase().includes(q))
    );
    const dir = sortDesc ? -1 : 1;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") {
        return av.localeCompare(bv) * dir;
      }
      // Symbols with no crossover in their history always sink to the bottom.
      if (av == null) return bv == null ? 0 : 1;
      if (bv == null) return -1;
      return ((av as number) - (bv as number)) * dir;
    });
  }, [rows, query, filter, sortKey, sortDesc]);

  const histMax = useMemo(
    () => Math.max(0, ...rows.map((r) => Math.abs(r.histPercent))),
    [rows]
  );

  const handleSort = (key: SortKey | "trend" | "zero") => {
    // Trend is just the sign of the histogram, so sort by the histogram.
    if (key === "zero") return;
    const target: SortKey = key === "trend" ? "histPercent" : key;
    if (target === sortKey) {
      setSortDesc((d) => !d);
    } else {
      setSortKey(target);
      // Most recent crossovers first; everything else largest first.
      setSortDesc(target !== "symbol" && target !== "crossAgo");
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>
          Analisi <span className={styles.headerSub}>— MACD</span>
        </h1>
        <div className={styles.controls}>
          <input
            className={styles.search}
            placeholder="Cerca simbolo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className={styles.group} title="Timeframe">
            {ANALYSIS_TIMEFRAMES.map((t) => (
              <button
                key={t}
                type="button"
                className={t === tf ? styles.active : styles.button}
                onClick={() => setTf(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.subheader}>
        <p className={styles.lead}>
          MACD({MACD_FAST}, {MACD_SLOW}, {MACD_SIGNAL}) sulle candele {tf},
          calcolato come nel bot. L&apos;ultima candela può essere ancora in
          formazione.
        </p>
        <div className={styles.group}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={f.key === filter ? styles.active : styles.button}
              onClick={() => setFilter(f.key)}
            >
              {f.label} <span className={styles.count}>{counts[f.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {error && <p className={styles.error}>Errore: {error}</p>}
      {loading && <p className={styles.status}>Calcolo in corso...</p>}

      {!loading && !error && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.rank}>#</th>
                {COLUMNS.map((col) => {
                  const sorted =
                    col.key === sortKey ||
                    (col.key === "trend" && sortKey === "histPercent");
                  return (
                    <th
                      key={col.key}
                      title={col.title || undefined}
                      className={sorted ? styles.sorted : undefined}
                      style={
                        col.key === "zero" ? { cursor: "default" } : undefined
                      }
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                      {col.key === sortKey && (sortDesc ? " ▾" : " ▴")}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visible.map((r, i) => {
                const width =
                  histMax > 0 ? (Math.abs(r.histPercent) / histMax) * 50 : 0;
                const up = r.histPercent >= 0;
                return (
                  <tr key={r.symbol}>
                    <td className={styles.rank}>{i + 1}</td>
                    <td>
                      <div className={styles.symbolCell}>
                        <ChartLink symbol={r.symbol} timeframe={tf} />
                        <span className={styles.symbol}>{r.symbol}</span>
                        {r.name && (
                          <span className={styles.name}>{r.name}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className={styles.barCell}>
                        <span
                          className={`${styles.num} ${up ? styles.up : styles.down}`}
                        >
                          {up ? "+" : ""}
                          {r.histPercent.toFixed(3)}%
                        </span>
                        <span className={styles.diverge}>
                          <span
                            className={`${styles.divergeBar} ${up ? styles.barUp : styles.barDown}`}
                            style={{
                              left: up ? "50%" : `${50 - width}%`,
                              width: `${width}%`,
                            }}
                          />
                        </span>
                      </div>
                    </td>
                    <td
                      className={`${styles.num} ${r.histDelta >= 0 ? styles.up : styles.down}`}
                      title={`${r.histDelta >= 0 ? "+" : ""}${r.histDelta.toFixed(4)}%`}
                    >
                      {r.histDelta >= 0 ? "▲ in aumento" : "▼ in calo"}
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${r.trend === "bullish" ? styles.oversold : styles.overbought}`}
                      >
                        {r.trend === "bullish" ? "Rialzista" : "Ribassista"}
                      </span>
                    </td>
                    <td
                      className={`${styles.num} ${
                        r.crossAgo != null && r.crossAgo <= RECENT_CROSS
                          ? styles.recent
                          : ""
                      }`}
                    >
                      {crossLabel(r.crossAgo)}
                    </td>
                    <td className={r.aboveZero ? styles.up : styles.down}>
                      {r.aboveZero ? "Sopra" : "Sotto"}
                    </td>
                    <td className={styles.num}>
                      {r.lastPrice.toLocaleString("it-IT")}
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className={styles.empty}>
                    Nessun simbolo
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
