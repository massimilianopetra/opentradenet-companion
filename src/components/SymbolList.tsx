"use client";

import { useMemo, useState } from "react";
import type { SymbolSummary } from "@/app/api/symbols/route";
import { splitDescription } from "@/lib/symbolInfo";
import styles from "./SymbolList.module.css";

type Filter = "all" | "favorites";

export default function SymbolList({
  symbols,
  selected,
  onSelect,
  onToggleFavorite,
}: {
  symbols: SymbolSummary[];
  selected: string;
  onSelect: (symbol: string) => void;
  onToggleFavorite: (symbol: string, favorite: boolean) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const sorted = useMemo(() => {
    const byFilter =
      filter === "favorites" ? symbols.filter((s) => s.favorite) : symbols;

    const q = query.trim().toLowerCase();
    const byQuery = q
      ? byFilter.filter((s) => {
          const name = splitDescription(s.description)?.name;
          return (
            s.symbol.toLowerCase().includes(q) ||
            name?.toLowerCase().includes(q)
          );
        })
      : byFilter;

    return [...byQuery].sort((a, b) => {
      const aChange = a.changePercent ?? -Infinity;
      const bChange = b.changePercent ?? -Infinity;
      return bChange - aChange;
    });
  }, [symbols, filter, query]);

  return (
    <div>
      <input
        type="text"
        className={styles.search}
        placeholder="Cerca titolo..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className={styles.tabs}>
        <button
          type="button"
          className={filter === "all" ? styles.tabActive : styles.tab}
          onClick={() => setFilter("all")}
        >
          Tutti
        </button>
        <button
          type="button"
          className={filter === "favorites" ? styles.tabActive : styles.tab}
          onClick={() => setFilter("favorites")}
        >
          Preferiti
        </button>
      </div>

      <ul className={styles.list}>
        {sorted.length === 0 && (
          <li className={styles.empty}>
            {query
              ? "Nessun titolo trovato"
              : filter === "favorites"
                ? "Nessun titolo preferito"
                : "Nessun titolo"}
          </li>
        )}
        {sorted.map((s) => {
          const change = s.changePercent;
          const changeClass =
            change == null
              ? styles.neutral
              : change >= 0
                ? styles.positive
                : styles.negative;

          return (
            <li key={s.symbol}>
              <div
                className={
                  s.symbol === selected
                    ? `${styles.row} ${styles.rowSelected}`
                    : styles.row
                }
              >
                <button
                  type="button"
                  className={s.favorite ? styles.starActive : styles.star}
                  aria-label={
                    s.favorite ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(s.symbol, !s.favorite);
                  }}
                >
                  {s.favorite ? "★" : "☆"}
                </button>
                <button
                  type="button"
                  className={styles.rowButton}
                  onClick={() => onSelect(s.symbol)}
                  title={s.description}
                >
                  <span className={styles.symbol}>{s.symbol}</span>
                  <span className={changeClass}>
                    {change == null
                      ? "—"
                      : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}
                  </span>
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
