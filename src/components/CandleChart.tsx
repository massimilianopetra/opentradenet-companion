"use client";

import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef, useState } from "react";
import type { Candle } from "@/lib/candles";
import { ema, linearRegressionChannel, macd } from "@/lib/indicators";
import { RegressionChannelPrimitive } from "./regressionChannelPrimitive";
import { MeasurePrimitive, type MeasurePoint } from "./measurePrimitive";
import { drawLegendBox, type LegendItem } from "./chartLegendCanvas";
import styles from "./CandleChart.module.css";

const EMA_LINES: { period: number; color: string; title: string }[] = [
  { period: 9, color: "#ffd700", title: "EMA9" },
  { period: 21, color: "#ff6b6b", title: "EMA21" },
  { period: 50, color: "#4ecdc4", title: "EMA50" },
];

const REGRESSION_COLOR = "#5b8def";
const MACD_COLOR = "#58a6ff";
const SIGNAL_COLOR = "#ffd700";

const REGRESSION_BAR_OPTIONS = [50, 100, 240, 500] as const;

const PRICE_PANE_HEIGHT = 430;
const MACD_PANE_HEIGHT = 150;
const TOTAL_HEIGHT = PRICE_PANE_HEIGHT + MACD_PANE_HEIGHT;

function MeasureIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="6" cy="18" r="2.5" fill="currentColor" />
      <circle cx="18" cy="6" r="2.5" fill="currentColor" />
      <line
        x1="8.2"
        y1="15.8"
        x2="15.8"
        y2="8.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="2.5 2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChannelIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line
        x1="3"
        y1="14"
        x2="21"
        y2="2"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="2 2"
        opacity="0.6"
      />
      <line x1="3" y1="19" x2="21" y2="7" stroke="currentColor" strokeWidth="1.5" />
      <line
        x1="3"
        y1="24"
        x2="21"
        y2="12"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="2 2"
        opacity="0.6"
      />
    </svg>
  );
}

export default function CandleChart({
  candles,
  symbol,
  timeframe,
}: {
  candles: Candle[];
  symbol?: string;
  timeframe?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const measurePrimitiveRef = useRef<MeasurePrimitive | null>(null);
  const measurePointsRef = useRef<MeasurePoint[]>([]);
  const measureModeRef = useRef(false);

  const [showRegression, setShowRegression] = useState(false);
  const [regressionBars, setRegressionBars] = useState<number | undefined>(240);
  const [measureMode, setMeasureMode] = useState(false);
  const [measureStep, setMeasureStep] = useState(0);

  // ── chart + candles + EMA + MACD (rebuilt only when the candle set changes) ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "#0b0e11" },
        textColor: "#d1d4dc",
      },
      grid: {
        vertLines: { color: "#1e222d" },
        horzLines: { color: "#1e222d" },
      },
      width: container.clientWidth,
      height: TOTAL_HEIGHT,
      timeScale: { timeVisible: true, secondsVisible: false },
    });
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });
    candleSeriesRef.current = candleSeries;

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    candleSeries.setData(
      candles.map((c) => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    volumeSeries.setData(
      candles.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.volume,
        color:
          c.close >= c.open ? "rgba(38,166,154,0.5)" : "rgba(239,83,80,0.5)",
      }))
    );

    const closes = candles.map((c) => c.close);

    for (const { period, color, title } of EMA_LINES) {
      const values = ema(closes, period);
      const series = chart.addSeries(LineSeries, {
        color,
        lineWidth: 1,
        title,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      series.setData(
        candles
          .map((c, i) => ({ time: c.time as UTCTimestamp, value: values[i] }))
          .filter(
            (point): point is { time: UTCTimestamp; value: number } =>
              point.value != null
          )
      );
    }

    // ── measure tool: attached once, driven by click coordinates below ──
    const measurePrimitive = new MeasurePrimitive();
    candleSeries.attachPrimitive(measurePrimitive);
    measurePrimitiveRef.current = measurePrimitive;

    const handleMeasureClick = (param: MouseEventParams<Time>) => {
      if (!measureModeRef.current) return;
      if (param.point === undefined || param.time === undefined) return;
      if (param.paneIndex !== 0) return;

      const price = candleSeries.coordinateToPrice(param.point.y);
      if (price == null) return;

      const time = param.time as UTCTimestamp;
      const index = candles.findIndex((c) => c.time === time);
      const nextPoint: MeasurePoint = { time, price, index: Math.max(index, 0) };

      const current = measurePointsRef.current;
      const next = current.length >= 2 ? [nextPoint] : [...current, nextPoint];
      measurePointsRef.current = next;
      measurePrimitive.setPoints(next);
      setMeasureStep(next.length);
      chart.applyOptions({});
    };
    chart.subscribeClick(handleMeasureClick);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && measurePointsRef.current.length > 0) {
        measurePointsRef.current = [];
        measurePrimitive.setPoints([]);
        setMeasureStep(0);
        chart.applyOptions({});
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    // ── MACD pane ──────────────────────────────────────────────────────
    const { macdLine, signalLine, histogram } = macd(closes);

    const histColors = new Map<number, string>();
    const validHist: { index: number; value: number }[] = [];
    histogram.forEach((v, i) => {
      if (v != null) validHist.push({ index: i, value: v });
    });
    validHist.forEach(({ index, value }, i) => {
      const prev = i > 0 ? validHist[i - 1].value : value;
      let color: string;
      if (value >= 0) {
        color = value >= prev ? "#26a641" : "#74c99a";
      } else {
        color = value <= prev ? "#f85149" : "#f4a59a";
      }
      histColors.set(index, color);
    });

    const histogramSeries = chart.addSeries(
      HistogramSeries,
      { priceLineVisible: false, lastValueVisible: false },
      1
    );
    histogramSeries.setData(
      candles
        .map((c, i) => ({
          time: c.time as UTCTimestamp,
          value: histogram[i],
          color: histColors.get(i),
        }))
        .filter(
          (point): point is { time: UTCTimestamp; value: number; color: string } =>
            point.value != null
        )
    );
    histogramSeries.createPriceLine({
      price: 0,
      color: "#30363d",
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: false,
      title: "",
    });

    const macdSeries = chart.addSeries(
      LineSeries,
      {
        color: MACD_COLOR,
        lineWidth: 1,
        title: "MACD",
        priceLineVisible: false,
        lastValueVisible: false,
      },
      1
    );
    macdSeries.setData(
      candles
        .map((c, i) => ({ time: c.time as UTCTimestamp, value: macdLine[i] }))
        .filter(
          (point): point is { time: UTCTimestamp; value: number } =>
            point.value != null
        )
    );

    const signalSeries = chart.addSeries(
      LineSeries,
      {
        color: SIGNAL_COLOR,
        lineWidth: 1,
        title: "Signal",
        priceLineVisible: false,
        lastValueVisible: false,
      },
      1
    );
    signalSeries.setData(
      candles
        .map((c, i) => ({ time: c.time as UTCTimestamp, value: signalLine[i] }))
        .filter(
          (point): point is { time: UTCTimestamp; value: number } =>
            point.value != null
        )
    );

    const panes = chart.panes();
    panes[0]?.setHeight(PRICE_PANE_HEIGHT);
    panes[1]?.setHeight(MACD_PANE_HEIGHT);

    chart.timeScale().fitContent();

    const handleResize = () => {
      chart.applyOptions({ width: container.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
      chart.unsubscribeClick(handleMeasureClick);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      measurePrimitiveRef.current = null;
      measurePointsRef.current = [];
      setMeasureStep(0);
    };
  }, [candles]);

  // ── linear regression channel: added/removed independently so toggling ──
  // it doesn't rebuild the whole chart (and reset pan/zoom).
  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    if (!chart || !candleSeries || !showRegression) return;

    const closes = candles.map((c) => c.close);
    const { mid, upper, lower } = linearRegressionChannel(closes, regressionBars);

    const channelPoints = candles
      .map((c, i) => ({
        time: c.time as UTCTimestamp,
        mid: mid[i],
        upper: upper[i],
        lower: lower[i],
      }))
      .filter(
        (p): p is { time: UTCTimestamp; mid: number; upper: number; lower: number } =>
          p.mid != null && p.upper != null && p.lower != null
      );

    const primitive = new RegressionChannelPrimitive(channelPoints);
    candleSeries.attachPrimitive(primitive);

    const midSeries = chart.addSeries(LineSeries, {
      color: REGRESSION_COLOR,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    midSeries.setData(channelPoints.map((p) => ({ time: p.time, value: p.mid })));

    const bandSeries = (["upper", "lower"] as const).map((key) => {
      const series = chart.addSeries(LineSeries, {
        color: "rgba(91,141,239,0.5)",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      series.setData(channelPoints.map((p) => ({ time: p.time, value: p[key] })));
      return series;
    });

    return () => {
      // The mount effect's own cleanup may have already torn the chart down
      // (e.g. symbol/timeframe change), disposing these series first.
      try {
        candleSeries.detachPrimitive(primitive);
        chart.removeSeries(midSeries);
        for (const series of bandSeries) chart.removeSeries(series);
      } catch {
        // already disposed
      }
    };
  }, [candles, showRegression, regressionBars]);

  // Kept in sync so the click handler (subscribed once, above) always sees
  // the latest toggle state without needing to resubscribe.
  useEffect(() => {
    measureModeRef.current = measureMode;
  }, [measureMode]);

  const handleToggleMeasure = () => {
    const next = !measureMode;
    setMeasureMode(next);
    if (!next) {
      measurePointsRef.current = [];
      measurePrimitiveRef.current?.setPoints([]);
      setMeasureStep(0);
      chartRef.current?.applyOptions({});
    }
  };

  const handleExport = () => {
    const chart = chartRef.current;
    const container = containerRef.current;
    if (!chart || !container) return;

    const source = chart.takeScreenshot();
    const scale = source.width / container.clientWidth;

    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(source, 0, 0);

    const emaItems: LegendItem[] = EMA_LINES.map(({ title, color }) => ({
      label: title,
      color,
    }));
    if (showRegression) {
      emaItems.push({
        label: `LR (${regressionBars ?? candles.length})`,
        color: REGRESSION_COLOR,
      });
    }
    drawLegendBox(ctx, 8 * scale, 8 * scale, scale, emaItems, "column");
    drawLegendBox(
      ctx,
      8 * scale,
      (PRICE_PANE_HEIGHT + 8) * scale,
      scale,
      [
        { label: "MACD", color: MACD_COLOR },
        { label: "Signal", color: SIGNAL_COLOR },
      ],
      "row"
    );

    const link = document.createElement("a");
    const parts = [symbol, timeframe, new Date().toISOString().slice(0, 10)].filter(
      Boolean
    );
    link.download = `${parts.join("_") || "chart"}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.92);
    link.click();
  };

  const measureHint =
    measureStep === 0
      ? "Clicca il punto di partenza"
      : measureStep === 1
        ? "Clicca il punto di arrivo"
        : "Clicca per una nuova misura (Esc per pulire)";

  return (
    <div className={styles.wrapper}>
      <button type="button" className={styles.exportButton} onClick={handleExport}>
        Esporta JPEG
      </button>

      <div className={styles.legend}>
        {EMA_LINES.map(({ title, color }) => (
          <span key={title} className={styles.legendItem}>
            <span className={styles.swatch} style={{ background: color }} />
            {title}
          </span>
        ))}
        {showRegression && (
          <span className={styles.legendItem}>
            <span
              className={styles.swatch}
              style={{ background: REGRESSION_COLOR }}
            />
            LR ({regressionBars ?? candles.length})
          </span>
        )}
      </div>

      <div
        className={styles.legendMacd}
        style={{ top: PRICE_PANE_HEIGHT + 8 }}
      >
        <span className={styles.legendItem}>
          <span className={styles.swatch} style={{ background: MACD_COLOR }} />
          MACD
        </span>
        <span className={styles.legendItem}>
          <span className={styles.swatch} style={{ background: SIGNAL_COLOR }} />
          Signal
        </span>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolRow}>
          <button
            type="button"
            className={[styles.toolButton, measureMode ? styles.toolButtonActive : ""].join(" ")}
            onClick={handleToggleMeasure}
            title="Misura la variazione % tra due punti del grafico"
            aria-pressed={measureMode}
          >
            <MeasureIcon />
          </button>
          {measureMode && <div className={styles.toolFlyout}>{measureHint}</div>}
        </div>

        <div className={styles.toolDivider} />

        <div className={styles.toolRow}>
          <button
            type="button"
            className={[styles.toolButton, showRegression ? styles.toolButtonActive : ""].join(" ")}
            onClick={() => setShowRegression((v) => !v)}
            title="Canale di regressione lineare"
            aria-pressed={showRegression}
          >
            <ChannelIcon />
          </button>
          {showRegression && (
            <div className={styles.toolFlyout}>
              <select
                className={styles.toolSelect}
                value={regressionBars ?? "all"}
                onChange={(e) =>
                  setRegressionBars(
                    e.target.value === "all" ? undefined : Number(e.target.value)
                  )
                }
              >
                {REGRESSION_BAR_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} candele
                  </option>
                ))}
                <option value="all">Tutte</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: TOTAL_HEIGHT,
          cursor: measureMode ? "crosshair" : "default",
        }}
      />
    </div>
  );
}
