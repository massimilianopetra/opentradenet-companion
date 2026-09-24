import type {
  IChartApi,
  ISeriesApi,
  ISeriesPrimitive,
  Logical,
  SeriesAttachedParameter,
  Time,
} from "lightweight-charts";
import type { CanvasRenderingTarget2D } from "fancy-canvas";

/**
 * A freehand point is anchored by fractional logical bar index (not time) so
 * the pen isn't snapped to candle centres between bars.
 */
export interface StrokePoint {
  logical: Logical;
  price: number;
}

export interface Stroke {
  points: StrokePoint[];
  color: string;
}

const LINE_WIDTH = 2.5;

/**
 * Draws freehand pencil strokes, including the one currently being drawn.
 * Coordinates are recomputed from logical index/price on every draw so the
 * strokes follow pan/zoom.
 */
export class StrokePrimitive implements ISeriesPrimitive<Time> {
  private chart: IChartApi | null = null;
  private series: ISeriesApi<"Candlestick"> | null = null;
  private strokes: Stroke[] = [];

  attached({ chart, series }: SeriesAttachedParameter<Time>): void {
    this.chart = chart;
    this.series = series as ISeriesApi<"Candlestick">;
  }

  detached(): void {
    this.chart = null;
    this.series = null;
  }

  updateAllViews(): void {}

  setStrokes(strokes: Stroke[]): void {
    this.strokes = strokes;
  }

  toCoordinates(p: StrokePoint): { x: number; y: number } | null {
    if (!this.chart || !this.series) return null;
    const x = this.chart.timeScale().logicalToCoordinate(p.logical);
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
              context.lineJoin = "round";
              context.lineWidth = LINE_WIDTH;
              for (const stroke of this.strokes) {
                const coords = stroke.points
                  .map((p) => this.toCoordinates(p))
                  .filter((c): c is { x: number; y: number } => c != null);
                if (coords.length === 0) continue;
                context.strokeStyle = stroke.color;
                context.fillStyle = stroke.color;
                if (coords.length === 1) {
                  context.beginPath();
                  context.arc(coords[0].x, coords[0].y, LINE_WIDTH / 2, 0, Math.PI * 2);
                  context.fill();
                  continue;
                }
                context.beginPath();
                context.moveTo(coords[0].x, coords[0].y);
                for (const c of coords.slice(1)) context.lineTo(c.x, c.y);
                context.stroke();
              }
            });
          },
        }),
      },
    ];
  }
}
