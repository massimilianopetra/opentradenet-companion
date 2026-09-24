"use client";

import { useEffect, useMemo, useState } from "react";
import ChartLink from "@/components/ChartLink";
import {
  ANALYSIS_TIMEFRAMES,
  type AnalysisTimeframe,
} from "@/lib/analysisTimeframes";
import {
  DEFAULT_TREND_BARS,
  TREND_BAR_OPTIONS,
  type TrendRow,
} from "@/lib/trendAnalysis";
import styles from "../analysis.module.css";

/** R² at or above this counts as a "clean" trend. */
const STRONG_R2 = 0.7;

type SortKey = keyof Pick<
  TrendRow,
  "symbol" | "slopePercent" | "windowPercent" | "r2" | "channelSigma" | "lastPrice"
>;
type Filter = "all" | "up" | "down" | "strong";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Tutti" },
  { key: "up", label: "Rialzisti" },
  { key: "down", label: "Ribassisti" },
  { key: "strong", label: `Trend pulito (R² ≥ ${STRONG_R2})` },
];

const COLUMNS: { key: SortKey; label: string; title: string }[] = [
  { key: "symbol", label: "Simbolo", title: "" },
  {
    key: "slopePercent",
    label: "Pendenza",
    title: "Pendenza della retta di regressione, in % del prezzo medio per candela",
  },
  {
    key: "windowPercent",
    label: "Var. finestra",
    title: "Variazione della retta di regressione dall'inizio alla fine della finestra",
  },
  {
    key: "r2",
    label: "R²",
    title: "Quanto il prezzo segue la retta (1 = perfettamente, 0 = per niente)",
  },
  {
    key: "channelSigma",
    label: "Posizione",
    title: "Ultimo prezzo rispetto alla retta, in deviazioni standard (canale = ±2σ)",
  },
  { key: "lastPrice", label: "Prezzo", title: "Ultimo prezzo" },
];

const matchesFilter = (r: TrendRow, filter: Filter) => {
  switch (filter) {
    case "up":
      return r.slopePercent > 0;
    case "down":
      return r.slopePercent < 0;
    case "strong":
      return r.r2 >= STRONG_R2;
    default:
      return true;
  }
};

const signed = (v: number, digits: number) =>
  `${v >= 0 ? "+" : ""}${v.toFixed(digits)}`;

export default function TrendPage() {
  const [tf, setTf] = useState<AnalysisTimeframe>("1h");
  const [bars, setBars] = useState<number>(DEFAULT_TREND_BARS);
  const [rows, setRows] = useState<TrendRow[]>([]);
  const [rowsFor, setRowsFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("slopePercent");
  const [sortDesc, setSortDesc] = useState(true);
  const requestKey = `${tf}:${bars}`;
  const loading = rowsFor !== requestKey;

  // Computed only while this page is open (and on tf/window change), never
  // in the background: a cold scan of every symbol takes several seconds.
  useEffect(() => {
    let ignore = false;
    fetch(`/api/analysis/trend?tf=${tf}&bars=${bars}`)
      .then((res) => res.json())
      .then((data: { rows: TrendRow[] } | { error: string }) => {
        if (ignore) return;
        if ("error" in data) {
          setError(data.error);
          setRows([]);
        } else {
          setError(null);
          setRows(data.rows);
        }
        setRowsFor(`${tf}:${bars}`);
      })
      .catch((err) => {
        if (ignore) return;
        setError(String(err));
        setRowsFor(`${tf}:${bars}`);
      });
    return () => {
      ignore = true;
    };
  }, [tf, bars]);

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
      return ((av as number) - (bv as number)) * dir;
    });
  }, [rows, query, filter, sortKey, sortDesc]);

  const slopeMax = useMemo(
    () => Math.max(0, ...rows.map((r) => Math.abs(r.slopePercent))),
    [rows]
  );

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDesc((d) => !d);
    } else {
      setSortKey(key);
      setSortDesc(key !== "symbol");
    }
  };

  const shortHistory = rows.filter((r) => r.bars < bars).length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>
          Analisi <span className={styles.headerSub}>— Trend</span>
        </h1>
        <div className={styles.controls}>
          <input
            className={styles.search}
            placeholder="Cerca simbolo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className={styles.group} title="Candele della regressione">
            {TREND_BAR_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                className={n === bars ? styles.active : styles.button}
                onClick={() => setBars(n)}
              >
                {n}
              </button>
            ))}
          </div>
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
          Regressione lineare sulle ultime {bars} candele {tf} (come la trend
          line del grafico); pendenza in % per candela.
          {!loading && shortHistory > 0 && (
            <> {shortHistory} simboli hanno meno storico e usano meno candele (esclusi quelli sotto la metà).</>
          )}
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
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    title={col.title || undefined}
                    className={col.key === sortKey ? styles.sorted : undefined}
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    {col.key === sortKey && (sortDesc ? " ▾" : " ▴")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r, i) => {
                const width =
                  slopeMax > 0 ? (Math.abs(r.slopePercent) / slopeMax) * 50 : 0;
                const up = r.slopePercent >= 0;
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
                          className={`${styles.num} ${styles.numWide} ${up ? styles.up : styles.down}`}
                        >
                          {signed(r.slopePercent, Math.abs(r.slopePercent) < 0.01 ? 4 : 3)}
                          % / {tf}
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
                      className={`${styles.num} ${r.windowPercent >= 0 ? styles.up : styles.down}`}
                      title={r.bars < bars ? `Solo ${r.bars} candele disponibili` : undefined}
                    >
                      {signed(r.windowPercent, 2)}%
                      {r.bars < bars && <span className={styles.partial}> ({r.bars})</span>}
                    </td>
                    <td className={`${styles.num} ${r.r2 >= STRONG_R2 ? styles.recent : ""}`}>
                      {r.r2.toFixed(2)}
                    </td>
                    <td className={styles.num}>{signed(r.channelSigma, 2)}σ</td>
                    <td className={styles.num}>
                      {r.lastPrice.toLocaleString("it-IT")}
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className={styles.empty}>
                    {rows.length === 0
                      ? `Nessun simbolo ha almeno ${Math.ceil(bars / 2)} candele ${tf}: scegli una finestra più corta`
                      : "Nessun simbolo"}
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
