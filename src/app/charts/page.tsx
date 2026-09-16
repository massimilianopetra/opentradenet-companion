"use client";

import { useEffect, useMemo, useState } from "react";
import CandleChart from "@/components/CandleChart";
import SymbolList from "@/components/SymbolList";
import SymbolInfoPanel from "@/components/SymbolInfoPanel";
import TimeframeSelector from "@/components/TimeframeSelector";
import type { Candle, Timeframe } from "@/lib/candles";
import { splitDescription, type SymbolInfo } from "@/lib/symbolInfo";
import type { SymbolSummary } from "@/app/api/symbols/route";
import styles from "./page.module.css";

export default function ChartsPage() {
  const [symbols, setSymbols] = useState<SymbolSummary[]>([]);
  const [symbol, setSymbol] = useState<string>("");
  const [timeframe, setTimeframe] = useState<Timeframe>("15m");
  const [showRegression, setShowRegression] = useState(false);
  const [regressionBars, setRegressionBars] = useState(240);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [candlesFor, setCandlesFor] = useState<string | null>(null);
  const [symbolInfo, setSymbolInfo] = useState<SymbolInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loading = symbol !== "" && candlesFor !== `${symbol}:${timeframe}`;

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
    const key = `${symbol}:${timeframe}`;

    fetch(`/api/candles/${symbol}?tf=${timeframe}`)
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
        setCandlesFor(key);
      })
      .catch((err) => {
        if (ignore) return;
        setError(String(err));
        setCandlesFor(key);
      });

    return () => {
      ignore = true;
    };
  }, [symbol, timeframe]);

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
          <label className={styles.regressionToggle}>
            <input
              type="checkbox"
              checked={showRegression}
              onChange={(e) => setShowRegression(e.target.checked)}
            />
            Regressione lineare
          </label>
          {showRegression && (
            <select
              className={styles.regressionBars}
              value={regressionBars === Infinity ? "all" : regressionBars}
              onChange={(e) =>
                setRegressionBars(
                  e.target.value === "all" ? Infinity : Number(e.target.value)
                )
              }
            >
              <option value={50}>50 candele</option>
              <option value={100}>100 candele</option>
              <option value={240}>240 candele</option>
              <option value={500}>500 candele</option>
              <option value="all">Tutte</option>
            </select>
          )}
          <TimeframeSelector value={timeframe} onChange={setTimeframe} />
        </div>

        {error && <p className={styles.error}>Errore: {error}</p>}
        {loading && <p className={styles.status}>Caricamento {symbol}...</p>}
        {!loading && !error && candles.length > 0 && (
          <CandleChart
            candles={candles}
            showRegression={showRegression}
            regressionBars={
              regressionBars === Infinity ? undefined : regressionBars
            }
            symbol={symbol}
            timeframe={timeframe}
          />
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
