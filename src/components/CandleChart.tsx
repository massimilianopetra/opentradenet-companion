"use client";

import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import type { Candle } from "@/lib/candles";
import { ema, linearRegressionChannel, macd } from "@/lib/indicators";
import { RegressionChannelPrimitive } from "./regressionChannelPrimitive";
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

const PRICE_PANE_HEIGHT = 430;
const MACD_PANE_HEIGHT = 150;
const TOTAL_HEIGHT = PRICE_PANE_HEIGHT + MACD_PANE_HEIGHT;

export default function CandleChart({
  candles,
  showRegression = false,
  regressionBars,
  symbol,
  timeframe,
}: {
  candles: Candle[];
  showRegression?: boolean;
  regressionBars?: number;
  symbol?: string;
  timeframe?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

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

    if (showRegression) {
      const { mid, upper, lower } = linearRegressionChannel(
        closes,
        regressionBars
      );

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

      candleSeries.attachPrimitive(new RegressionChannelPrimitive(channelPoints));

      const midSeries = chart.addSeries(LineSeries, {
        color: REGRESSION_COLOR,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      midSeries.setData(channelPoints.map((p) => ({ time: p.time, value: p.mid })));

      for (const key of ["upper", "lower"] as const) {
        const series = chart.addSeries(LineSeries, {
          color: "rgba(91,141,239,0.5)",
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        series.setData(channelPoints.map((p) => ({ time: p.time, value: p[key] })));
      }
    }

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
      chart.remove();
      chartRef.current = null;
    };
  }, [candles, showRegression, regressionBars]);

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
      <div ref={containerRef} style={{ width: "100%", height: TOTAL_HEIGHT }} />
    </div>
  );
}
