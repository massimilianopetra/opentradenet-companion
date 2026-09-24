"use client";

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

const pct = (v: number, signed = false) =>
  `${signed && v > 0 ? "+" : ""}${v.toFixed(2)}%`;

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

  const maxBody = useMemo(
    () => Math.max(0, ...rows.map((r) => r.bodyAvg)),
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

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>
          Analisi{" "}
          <span className={styles.headerSub}>— Volatilità apertura/chiusura</span>
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
                    <span className={styles.symbol}>{r.symbol}</span>
                    {r.name && <span className={styles.name}>{r.name}</span>}
                  </td>
                  <td>
                    <div className={styles.barCell}>
                      <span className={styles.num}>{pct(r.bodyAvg)}</span>
                      <span className={styles.barTrack}>
                        <span
                          className={styles.bar}
                          style={{
                            width: `${maxBody > 0 ? (r.bodyAvg / maxBody) * 100 : 0}%`,
                          }}
                        />
                      </span>
                    </div>
                  </td>
                  <td className={styles.num}>{pct(r.bodyMax)}</td>
                  <td className={styles.num}>{pct(r.rangeAvg)}</td>
                  <td className={styles.num}>{r.upDaysPercent.toFixed(0)}%</td>
                  <td
                    className={`${styles.num} ${r.lastBody >= 0 ? styles.up : styles.down}`}
                  >
                    {pct(r.lastBody, true)}
                  </td>
                  <td
                    className={`${styles.num} ${r.days < days ? styles.partial : ""}`}
                    title={
                      r.days < days
                        ? "Storico più corto del periodo richiesto"
                        : undefined
                    }
                  >
                    {r.days}
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
