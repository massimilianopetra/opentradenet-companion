import type {
  IChartApi,
  ISeriesApi,
  ISeriesPrimitive,
  SeriesAttachedParameter,
  Time,
  UTCTimestamp,
} from "lightweight-charts";
import type { CanvasRenderingTarget2D } from "fancy-canvas";

export interface SegmentPoint {
  time: UTCTimestamp;
  price: number;
}

export interface Segment {
  a: SegmentPoint;
  b: SegmentPoint;
  color: string;
}

const LINE_WIDTH = 2.5;

/**
 * Draws user-placed two-point line segments (trendlines), plus an optional
 * in-progress segment from the first clicked anchor to the cursor. Like
 * MeasurePrimitive, coordinates are recomputed from time/price on every draw
 * so the segments follow pan/zoom.
 */
export class SegmentPrimitive implements ISeriesPrimitive<Time> {
  private chart: IChartApi | null = null;
  private series: ISeriesApi<"Candlestick"> | null = null;
  private segments: Segment[] = [];
  private pending: { anchor: SegmentPoint; cursor: SegmentPoint | null; color: string } | null =
    null;

  attached({ chart, series }: SeriesAttachedParameter<Time>): void {
    this.chart = chart;
    this.series = series as ISeriesApi<"Candlestick">;
  }

  detached(): void {
    this.chart = null;
    this.series = null;
  }

  updateAllViews(): void {}

  setSegments(segments: Segment[]): void {
    this.segments = segments;
  }

  setPending(
    pending: { anchor: SegmentPoint; cursor: SegmentPoint | null; color: string } | null
  ): void {
    this.pending = pending;
  }

  toCoordinates(p: SegmentPoint): { x: number; y: number } | null {
    if (!this.chart || !this.series) return null;
    const x = this.chart.timeScale().timeToCoordinate(p.time);
    const y = this.series.priceToCoordinate(p.price);
    if (x == null || y == null) return null;
    return { x, y };
  }

  paneViews() {
    return [
      {
        zOrder: () => "top" as const,
        renderer: () => ({
          draw: (target: CanvasRenderingTarget2D) => {
            target.useMediaCoordinateSpace(({ context }) => {
              context.lineCap = "round";

              const drawSegment = (
                a: SegmentPoint,
                b: SegmentPoint,
                color: string,
                dashed: boolean
              ) => {
                const pa = this.toCoordinates(a);
                const pb = this.toCoordinates(b);
                if (!pa || !pb) return;
                context.setLineDash(dashed ? [6, 4] : []);
                context.strokeStyle = color;
                context.lineWidth = LINE_WIDTH;
                context.beginPath();
                context.moveTo(pa.x, pa.y);
                context.lineTo(pb.x, pb.y);
                context.stroke();
                context.setLineDash([]);
              };

              for (const s of this.segments) drawSegment(s.a, s.b, s.color, false);

              if (this.pending) {
                const { anchor, cursor, color } = this.pending;
                if (cursor) drawSegment(anchor, cursor, color, true);
                const p = this.toCoordinates(anchor);
                if (p) {
                  context.beginPath();
                  context.arc(p.x, p.y, 4, 0, Math.PI * 2);
                  context.fillStyle = color;
                  context.fill();
                  context.lineWidth = 1.5;
                  context.strokeStyle = "#0b0e11";
                  context.stroke();
                }
              }
            });
          },
        }),
      },
    ];
  }
}

/** Distance in px from point (px, py) to the segment a–b. */
export function distanceToSegment(
  px: number,
  py: number,
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / lenSq));
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}
