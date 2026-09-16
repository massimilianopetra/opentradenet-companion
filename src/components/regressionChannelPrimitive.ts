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

interface ChannelPoint {
  time: UTCTimestamp;
  mid: number;
  upper: number;
  lower: number;
}

/**
 * Draws the regression channel as a filled band behind the candles: blue
 * between the mid line and the upper bound, red between mid and lower —
 * matching the shaded channel in opentradenet_bot's matplotlib chart, which
 * lightweight-charts' built-in series types can't produce on their own
 * (Area/Baseline only fill toward a fixed horizontal baseline, not between
 * two arbitrary lines).
 */
export class RegressionChannelPrimitive implements ISeriesPrimitive<Time> {
  private chart: IChartApi | null = null;
  private series: ISeriesApi<"Candlestick"> | null = null;

  constructor(private points: ChannelPoint[]) {}

  attached({ chart, series }: SeriesAttachedParameter<Time>): void {
    this.chart = chart;
    this.series = series as ISeriesApi<"Candlestick">;
  }

  detached(): void {
    this.chart = null;
    this.series = null;
  }

  updateAllViews(): void {}

  paneViews() {
    return [
      {
        zOrder: () => "bottom" as const,
        renderer: () => ({
          draw: () => {},
          drawBackground: (target: CanvasRenderingTarget2D) => {
            const chart = this.chart;
            const series = this.series;
            if (!chart || !series) return;

            const timeScale = chart.timeScale();
            const coords = this.points
              .map((p) => ({
                x: timeScale.timeToCoordinate(p.time),
                mid: series.priceToCoordinate(p.mid),
                upper: series.priceToCoordinate(p.upper),
                lower: series.priceToCoordinate(p.lower),
              }))
              .filter(
                (
                  c
                ): c is {
                  x: Coordinate;
                  mid: Coordinate;
                  upper: Coordinate;
                  lower: Coordinate;
                } =>
                  c.x != null && c.mid != null && c.upper != null && c.lower != null
              );
            if (coords.length < 2) return;

            target.useMediaCoordinateSpace(({ context }) => {
              context.beginPath();
              context.moveTo(coords[0].x, coords[0].mid);
              for (const c of coords) context.lineTo(c.x, c.mid);
              for (let i = coords.length - 1; i >= 0; i--) {
                context.lineTo(coords[i].x, coords[i].upper);
              }
              context.closePath();
              context.fillStyle = "rgba(59,130,246,0.15)";
              context.fill();

              context.beginPath();
              context.moveTo(coords[0].x, coords[0].mid);
              for (const c of coords) context.lineTo(c.x, c.mid);
              for (let i = coords.length - 1; i >= 0; i--) {
                context.lineTo(coords[i].x, coords[i].lower);
              }
              context.closePath();
              context.fillStyle = "rgba(239,68,68,0.15)";
              context.fill();
            });
          },
        }),
      },
    ];
  }
}
