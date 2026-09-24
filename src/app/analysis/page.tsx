"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { VolatilityRow } from "@/lib/volatility";
import styles from "./page.module.css";

const DAY_PRESETS = [5, 10, 20, 30, 60, 90];

type SortKey = keyof Pick<
  VolatilityRow,
  "symbol" | "bodyAvg" | "bodyMax" | "rangeAvg" | "upDaysPercent" | "lastBody" | "days"
>;

const COLUMNS: { key: SortKey; label: string; title: string }[] = [
  { key: "symbol", label: "Simbolo", title: "" },
  {
    key: "bodyAvg",
    label: "|Chiusura − Apertura| medio",
    title: "Media giornaliera di |close − open| / open",
  },
  {
    key: "bodyMax",
    label: "Max giornaliero",
    title: "Giorno con la maggiore variazione apertura→chiusura",
  },
  {
    key: "rangeAvg",
    label: "Range medio (H−L)",
    title: "Media giornaliera di (high − low) / open",
  },
  {
    key: "upDaysPercent",
    label: "Giorni rialzo",
    title: "Percentuale di giorni chiusi sopra l'apertura",
  },
  {
    key: "lastBody",
    label: "Ultimo giorno",
    title: "Variazione apertura→chiusura dell'ultimo giorno completo",
  },
  { key: "days", label: "Giorni", title: "Giorni completi disponibili nel periodo" },
];

type NumericKey = Exclude<SortKey, "symbol">;

const NUMERIC_COLUMNS = COLUMNS.map((c) => c.key).filter(
  (k): k is NumericKey => k !== "symbol"
);

const pct = (v: number, signed = false) =>
  `${signed && v > 0 ? "+" : ""}${v.toFixed(2)}%`;

function formatValue(key: NumericKey, value: number): string {
  switch (key) {
    case "upDaysPercent":
      return `${value.toFixed(0)}%`;
    case "lastBody":
      return pct(value, true);
    case "days":
      return String(value);
    default:
      return pct(value);
  }
}

export default function AnalysisPage() {
  const [days, setDays] = useState(20);
  const [rows, setRows] = useState<VolatilityRow[]>([]);
  const [rowsFor, setRowsFor] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("bodyAvg");
  const [sortDesc, setSortDesc] = useState(true);
  const loading = rowsFor !== days;

  useEffect(() => {
    let ignore = false;
    fetch(`/api/analysis/volatility?days=${days}`)
      .then((res) => res.json())
      .then((data: { rows: VolatilityRow[] } | { error: string }) => {
        if (ignore) return;
        if ("error" in data) {
          setError(data.error);
          setRows([]);
        } else {
          setError(null);
          setRows(data.rows);
        }
        setRowsFor(days);
      })
      .catch((err) => {
        if (ignore) return;
        setError(String(err));
        setRowsFor(days);
      });
    return () => {
      ignore = true;
    };
  }, [days]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? rows.filter(
          (r) =>
            r.symbol.toLowerCase().includes(q) ||
            r.name?.toLowerCase().includes(q)
        )
      : rows;
    const dir = sortDesc ? -1 : 1;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") {
        return av.localeCompare(bv) * dir;
      }
      return ((av as number) - (bv as number)) * dir;
    });
  }, [rows, query, sortKey, sortDesc]);

  // The bar follows the sorted column (bodyAvg while sorting by symbol).
  const barKey: NumericKey = sortKey === "symbol" ? "bodyAvg" : sortKey;
  const barMax = useMemo(
    () => Math.max(0, ...rows.map((r) => Math.abs(r[barKey]))),
    [rows, barKey]
  );

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDesc((d) => !d);
    } else {
      setSortKey(key);
      setSortDesc(key !== "symbol");
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>
          Analisi{" "}
          <span className={styles.headerSub}>— Volatilità</span>
        </h1>
        <div className={styles.controls}>
          <input
            className={styles.search}
            placeholder="Cerca simbolo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className={styles.group}>
            {DAY_PRESETS.map((d) => (
              <button
                key={d}
                type="button"
                className={d === days ? styles.active : styles.button}
                onClick={() => setDays(d)}
              >
                {d}g
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className={styles.lead}>
        Per ogni simbolo, sugli ultimi {days} giorni completi (UTC, aggregati
        dalle candele 15m): quanto si sposta in media la chiusura rispetto
        all&apos;apertura.
      </p>

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
              {visible.map((r, i) => (
                <tr key={r.symbol}>
                  <td className={styles.rank}>{i + 1}</td>
                  <td>
                    <div className={styles.symbolCell}>
                      <Link
                        href={`/charts?symbol=${encodeURIComponent(r.symbol)}&tf=1d`}
                        className={styles.chartLink}
                        title={`Apri il grafico 1d di ${r.symbol}`}
                        aria-label={`Apri il grafico 1d di ${r.symbol}`}
                      >
                        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                          <path d="M2 2v12h12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M4.5 10.5 7.5 7l2 2 4-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </Link>
                      <span className={styles.symbol}>{r.symbol}</span>
                      {r.name && <span className={styles.name}>{r.name}</span>}
                    </div>
                  </td>
                  {NUMERIC_COLUMNS.map((key) => {
                    const value = r[key];
                    const className = [
                      styles.num,
                      key === "lastBody" && (value >= 0 ? styles.up : styles.down),
                      key === "days" && r.days < days && styles.partial,
                    ]
                      .filter(Boolean)
                      .join(" ");
                    const title =
                      key === "days" && r.days < days
                        ? "Storico più corto del periodo richiesto"
                        : undefined;
                    const text = formatValue(key, value);

                    if (key !== barKey) {
                      return (
                        <td key={key} className={className} title={title}>
                          {text}
                        </td>
                      );
                    }
                    return (
                      <td key={key} title={title}>
                        <div className={styles.barCell}>
                          <span className={className}>{text}</span>
                          <span className={styles.barTrack}>
                            <span
                              className={`${styles.bar} ${
                                key === "lastBody"
                                  ? value >= 0
                                    ? styles.barUp
                                    : styles.barDown
                                  : ""
                              }`}
                              style={{
                                width: `${barMax > 0 ? (Math.abs(value) / barMax) * 100 : 0}%`,
                              }}
                            />
                          </span>
                        </div>
                      </td>
                    );
                  })}
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
