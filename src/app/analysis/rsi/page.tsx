"use client";

import { useEffect, useMemo, useState } from "react";
import ChartLink from "@/components/ChartLink";
import {
  RSI_OVERBOUGHT,
  RSI_OVERSOLD,
  type RsiRow,
  type RsiZone,
} from "@/lib/rsiAnalysis";
import {
  ANALYSIS_TIMEFRAMES,
  type AnalysisTimeframe,
} from "@/lib/analysisTimeframes";
import styles from "../analysis.module.css";

const PERIODS = [7, 14, 21];

type SortKey = keyof Pick<RsiRow, "symbol" | "rsi" | "delta" | "streak" | "lastPrice">;
type ZoneFilter = "all" | Exclude<RsiZone, "neutral">;

const ZONE_FILTERS: { key: ZoneFilter; label: string }[] = [
  { key: "all", label: "Tutti" },
  { key: "overbought", label: `Ipercomprati >${RSI_OVERBOUGHT}` },
  { key: "oversold", label: `Ipervenduti <${RSI_OVERSOLD}` },
];

const ZONE_LABEL: Record<RsiZone, string> = {
  overbought: "Ipercomprato",
  oversold: "Ipervenduto",
  neutral: "Neutro",
};

const COLUMNS: { key: SortKey | "zone"; label: string; title: string }[] = [
  { key: "symbol", label: "Simbolo", title: "" },
  { key: "rsi", label: "RSI", title: "RSI (Wilder) dell'ultima candela" },
  { key: "delta", label: "Δ candela", title: "Variazione RSI rispetto alla candela precedente" },
  { key: "zone", label: "Zona", title: "" },
  { key: "streak", label: "In zona da", title: "Candele consecutive nella zona attuale" },
  { key: "lastPrice", label: "Prezzo", title: "Ultimo prezzo" },
];

export default function RsiPage() {
  const [tf, setTf] = useState<AnalysisTimeframe>("1h");
  const [period, setPeriod] = useState(14);
  const [rows, setRows] = useState<RsiRow[]>([]);
  const [rowsFor, setRowsFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("rsi");
  const [sortDesc, setSortDesc] = useState(true);
  const requestKey = `${tf}:${period}`;
  const loading = rowsFor !== requestKey;

  useEffect(() => {
    let ignore = false;
    fetch(`/api/analysis/rsi?tf=${tf}&period=${period}`)
      .then((res) => res.json())
      .then((data: { rows: RsiRow[] } | { error: string }) => {
        if (ignore) return;
        if ("error" in data) {
          setError(data.error);
          setRows([]);
        } else {
          setError(null);
          setRows(data.rows);
        }
        setRowsFor(`${tf}:${period}`);
      })
      .catch((err) => {
        if (ignore) return;
        setError(String(err));
        setRowsFor(`${tf}:${period}`);
      });
    return () => {
      ignore = true;
    };
  }, [tf, period]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      overbought: rows.filter((r) => r.zone === "overbought").length,
      oversold: rows.filter((r) => r.zone === "oversold").length,
    }),
    [rows]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = rows.filter(
      (r) =>
        (zoneFilter === "all" || r.zone === zoneFilter) &&
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
  }, [rows, query, zoneFilter, sortKey, sortDesc]);

  const handleSort = (key: SortKey | "zone") => {
    // Zone is just a banding of RSI, so sorting by it sorts by RSI.
    const target: SortKey = key === "zone" ? "rsi" : key;
    if (target === sortKey) {
      setSortDesc((d) => !d);
    } else {
      setSortKey(target);
      setSortDesc(target !== "symbol");
    }
  };

  const zoneClass = (zone: RsiZone) =>
    zone === "overbought" ? styles.down : zone === "oversold" ? styles.up : "";

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>
          Analisi <span className={styles.headerSub}>— RSI</span>
        </h1>
        <div className={styles.controls}>
          <input
            className={styles.search}
            placeholder="Cerca simbolo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className={styles.group} title="Periodo RSI">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                className={p === period ? styles.active : styles.button}
                onClick={() => setPeriod(p)}
              >
                {p}
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
          RSI({period}) di Wilder sulle candele {tf}, calcolato come nel bot.
          L&apos;ultima candela può essere ancora in formazione.
        </p>
        <div className={styles.group}>
          {ZONE_FILTERS.map((z) => (
            <button
              key={z.key}
              type="button"
              className={z.key === zoneFilter ? styles.active : styles.button}
              onClick={() => setZoneFilter(z.key)}
            >
              {z.label} <span className={styles.count}>{counts[z.key]}</span>
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
                    (col.key === "zone" && sortKey === "rsi");
                  return (
                    <th
                      key={col.key}
                      title={col.title || undefined}
                      className={sorted ? styles.sorted : undefined}
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
              {visible.map((r, i) => (
                <tr key={r.symbol}>
                  <td className={styles.rank}>{i + 1}</td>
                  <td>
                    <div className={styles.symbolCell}>
                      <ChartLink symbol={r.symbol} timeframe={tf} />
                      <span className={styles.symbol}>{r.symbol}</span>
                      {r.name && <span className={styles.name}>{r.name}</span>}
                    </div>
                  </td>
                  <td>
                    <div className={styles.barCell}>
                      <span className={`${styles.num} ${zoneClass(r.zone)}`}>
                        {r.rsi.toFixed(1)}
                      </span>
                      <span className={styles.gauge}>
                        <span
                          className={styles.gaugeLow}
                          style={{ width: `${RSI_OVERSOLD}%` }}
                        />
                        <span
                          className={styles.gaugeHigh}
                          style={{ width: `${100 - RSI_OVERBOUGHT}%` }}
                        />
                        <span
                          className={`${styles.gaugeMarker} ${styles[r.zone] ?? ""}`}
                          style={{ left: `${r.rsi}%` }}
                        />
                      </span>
                    </div>
                  </td>
                  <td
                    className={`${styles.num} ${r.delta >= 0 ? styles.up : styles.down}`}
                  >
                    {r.delta > 0 ? "+" : ""}
                    {r.delta.toFixed(1)}
                  </td>
                  <td>
                    <span className={`${styles.badge} ${styles[r.zone] ?? ""}`}>
                      {ZONE_LABEL[r.zone]}
                    </span>
                  </td>
                  <td className={styles.num}>
                    {r.streak} {r.streak === 1 ? "candela" : "candele"}
                  </td>
                  <td className={styles.num}>
                    {r.lastPrice.toLocaleString("it-IT")}
                  </td>
                </tr>
              ))}
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
