import type {
  Coordinate,
  IChartApi,
  ISeriesApi,
  ISeriesPrimitive,
  SeriesAttachedParameter,
  Time,
  UTCTimestamp,
} from "lightweight-charts";
import type { CanvasRenderingTarget2D } from "fancy-canvas";
import { roundedRectPath } from "./chartLegendCanvas";

export interface MeasurePoint {
  time: UTCTimestamp;
  price: number;
  index: number;
}

const UP_COLOR = "#26a69a";
const DOWN_COLOR = "#ef5350";
const ANCHOR_COLOR = "#5b8def";

function formatPrice(value: number): string {
  const abs = Math.abs(value);
  const decimals = abs >= 100 ? 2 : abs >= 1 ? 4 : 6;
  return value.toFixed(decimals);
}

/**
 * Draws the two-click "measure" tool: a dashed line between the anchor and
 * cursor points, markers at each end, and a floating badge with the %
 * change. Coordinates are recomputed from price/time on every draw call, so
 * the overlay tracks pan/zoom the same way RegressionChannelPrimitive does.
 */
export class MeasurePrimitive implements ISeriesPrimitive<Time> {
  private chart: IChartApi | null = null;
  private series: ISeriesApi<"Candlestick"> | null = null;
  private points: MeasurePoint[] = [];

  attached({ chart, series }: SeriesAttachedParameter<Time>): void {
    this.chart = chart;
    this.series = series as ISeriesApi<"Candlestick">;
  }

  detached(): void {
    this.chart = null;
    this.series = null;
  }

  updateAllViews(): void {}

  setPoints(points: MeasurePoint[]): void {
    this.points = points;
  }

  paneViews() {
    return [
      {
        zOrder: () => "top" as const,
        renderer: () => ({
          draw: (target: CanvasRenderingTarget2D) => {
            const chart = this.chart;
            const series = this.series;
            if (!chart || !series || this.points.length === 0) return;

            const timeScale = chart.timeScale();
            const raw = this.points.map((p) => ({
              x: timeScale.timeToCoordinate(p.time),
              y: series.priceToCoordinate(p.price),
              point: p,
            }));
            if (raw.some((c) => c.x == null || c.y == null)) return;
            const coords = raw as {
              x: Coordinate;
              y: Coordinate;
              point: MeasurePoint;
            }[];

            target.useMediaCoordinateSpace(({ context, mediaSize }) => {
              const [a, b] = coords;

              const drawMarker = (
                p: { x: Coordinate; y: Coordinate },
                color: string
              ) => {
                context.beginPath();
                context.arc(p.x, p.y, 4, 0, Math.PI * 2);
                context.fillStyle = color;
                context.fill();
                context.lineWidth = 1.5;
                context.strokeStyle = "#0b0e11";
                context.stroke();
              };

              if (!b) {
                drawMarker(a, ANCHOR_COLOR);
                return;
              }

              const rising = b.point.price >= a.point.price;
              const color = rising ? UP_COLOR : DOWN_COLOR;

              context.setLineDash([5, 4]);
              context.strokeStyle = color;
              context.lineWidth = 1.5;
              context.beginPath();
              context.moveTo(a.x, a.y);
              context.lineTo(b.x, b.y);
              context.stroke();
              context.setLineDash([]);

              drawMarker(a, color);
              drawMarker(b, color);

              const percent =
                ((b.point.price - a.point.price) / a.point.price) * 100;
              const delta = b.point.price - a.point.price;
              const bars = Math.abs(b.point.index - a.point.index);

              const pctText = `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`;
              const detailText = `${delta >= 0 ? "+" : ""}${formatPrice(delta)} · ${bars} candel${bars === 1 ? "a" : "e"}`;

              context.font = "600 13px -apple-system, BlinkMacSystemFont, sans-serif";
              const pctWidth = context.measureText(pctText).width;
              context.font = "12px -apple-system, BlinkMacSystemFont, sans-serif";
              const detailWidth = context.measureText(detailText).width;

              const paddingX = 10;
              const boxW = Math.max(pctWidth, detailWidth) + paddingX * 2;
              const boxH = 44;

              const midX = (a.x + b.x) / 2;
              const topY = Math.min(a.y, b.y);
              const bottomY = Math.max(a.y, b.y);

              let boxX = midX - boxW / 2;
              boxX = Math.min(Math.max(boxX, 4), mediaSize.width - boxW - 4);

              let boxY = topY - boxH - 12;
              if (boxY < 4) boxY = bottomY + 12;

              roundedRectPath(context, boxX, boxY, boxW, boxH, 6);
              context.fillStyle = "rgba(19,23,34,0.92)";
              context.fill();
              context.strokeStyle = color;
              context.lineWidth = 1;
              context.stroke();

              context.textBaseline = "middle";
              context.textAlign = "center";
              context.font = "600 13px -apple-system, BlinkMacSystemFont, sans-serif";
              context.fillStyle = color;
              context.fillText(pctText, boxX + boxW / 2, boxY + 17);

              context.font = "12px -apple-system, BlinkMacSystemFont, sans-serif";
              context.fillStyle = "#9198a1";
              context.fillText(detailText, boxX + boxW / 2, boxY + 33);
              context.textAlign = "left";
            });
          },
        }),
      },
    ];
  }
}
