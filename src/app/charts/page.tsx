"use client";

import { useEffect, useMemo, useState } from "react";
import CandleChart from "@/components/CandleChart";
import SymbolList from "@/components/SymbolList";
import SymbolInfoPanel from "@/components/SymbolInfoPanel";
import type { Candle } from "@/lib/candles";
import { splitDescription, type SymbolInfo } from "@/lib/symbolInfo";
import type { SymbolSummary } from "@/app/api/symbols/route";
import styles from "./page.module.css";

export default function ChartsPage() {
  const [symbols, setSymbols] = useState<SymbolSummary[]>([]);
  const [symbol, setSymbol] = useState<string>("");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [candlesFor, setCandlesFor] = useState<string | null>(null);
  const [symbolInfo, setSymbolInfo] = useState<SymbolInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loading = symbol !== "" && candlesFor !== symbol;

  useEffect(() => {
    fetch("/api/symbols")
      .then((res) => res.json())
      .then((data: SymbolSummary[] | { error: string }) => {
        if (!Array.isArray(data)) {
          setError(data.error);
          return;
        }
        setSymbols(data);
        if (data.length > 0) setSymbol(data[0].symbol);
      })
      .catch((err) => setError(String(err)));
  }, []);

  useEffect(() => {
    if (!symbol) return;
    let ignore = false;

    fetch(`/api/candles/${symbol}`)
      .then((res) => res.json())
      .then((data: { candles: Candle[] } | { error: string }) => {
        if (ignore) return;
        if ("error" in data) {
          setError(data.error);
          setCandles([]);
        } else {
          setError(null);
          setCandles(data.candles);
        }
        setCandlesFor(symbol);
      })
      .catch((err) => {
        if (ignore) return;
        setError(String(err));
        setCandlesFor(symbol);
      });

    return () => {
      ignore = true;
    };
  }, [symbol]);

  useEffect(() => {
    if (!symbol) return;
    fetch(`/api/symbols/${symbol}`)
      .then((res) => res.json())
      .then((data: { info: SymbolInfo | null }) => setSymbolInfo(data.info))
      .catch(() => setSymbolInfo(null));
  }, [symbol]);

  const selectedInfo = useMemo(
    () => symbols.find((s) => s.symbol === symbol),
    [symbols, symbol]
  );

  const name = useMemo(
    () => splitDescription(selectedInfo?.description)?.name,
    [selectedInfo]
  );

  const handleToggleFavorite = (target: string, favorite: boolean) => {
    setSymbols((prev) =>
      prev.map((s) => (s.symbol === target ? { ...s, favorite } : s))
    );
    fetch(`/api/favorites/${target}`, { method: favorite ? "PUT" : "DELETE" }).catch(
      () => {
        // revert on failure
        setSymbols((prev) =>
          prev.map((s) => (s.symbol === target ? { ...s, favorite: !favorite } : s))
        );
      }
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <div className={styles.header}>
          <h1>
            {symbol || "Grafici"}
            {name && <span className={styles.headerName}> — {name}</span>}
          </h1>
          {selectedInfo?.price != null && (
            <span className={styles.headerPrice}>
              {selectedInfo.price.toLocaleString("it-IT")}
              {selectedInfo.changePercent != null &&
                ` (${selectedInfo.changePercent >= 0 ? "+" : ""}${selectedInfo.changePercent.toFixed(2)}%)`}
            </span>
          )}
        </div>

        {error && <p className={styles.error}>Errore: {error}</p>}
        {loading && <p className={styles.status}>Caricamento {symbol}...</p>}
        {!loading && !error && candles.length > 0 && (
          <CandleChart candles={candles} />
        )}

        {symbol && <SymbolInfoPanel symbol={symbol} info={symbolInfo} />}
      </div>

      <aside className={styles.aside}>
        <p className={styles.asideTitle}>Titoli</p>
        <SymbolList
          symbols={symbols}
          selected={symbol}
          onSelect={setSymbol}
          onToggleFavorite={handleToggleFavorite}
        />
      </aside>
    </div>
  );
}
