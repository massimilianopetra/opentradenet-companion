/**
 * chart.takeScreenshot() only rasterizes lightweight-charts' own canvas — it
 * doesn't know about the HTML legend overlays drawn on top of it. To make
 * the exported image match what's on screen, we redraw those same legend
 * boxes onto the screenshot canvas by hand before exporting.
 */

export interface LegendItem {
  label: string;
  color: string;
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawLegendBox(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  scale: number,
  items: LegendItem[],
  direction: "column" | "row"
) {
  const fontSize = 12 * scale;
  const paddingX = 12 * scale;
  const paddingY = 8 * scale;
  const gap = direction === "column" ? 4 * scale : 12 * scale;
  const swatchW = 10 * scale;
  const swatchGap = 6 * scale;

  ctx.font = `${fontSize}px sans-serif`;
  ctx.textBaseline = "middle";

  const itemWidths = items.map(
    (item) => swatchW + swatchGap + ctx.measureText(item.label).width
  );

  const boxW =
    direction === "column"
      ? paddingX * 2 + Math.max(...itemWidths)
      : paddingX * 2 +
        itemWidths.reduce((a, b) => a + b, 0) +
        gap * (items.length - 1);
  const rowH = fontSize * 1.4;
  const boxH =
    direction === "column"
      ? paddingY * 2 + rowH * items.length + gap * (items.length - 1)
      : paddingY * 2 + rowH;

  roundedRectPath(ctx, originX, originY, boxW, boxH, 6 * scale);
  ctx.fillStyle = "rgba(19,23,34,0.75)";
  ctx.fill();
  ctx.strokeStyle = "#2a2e39";
  ctx.lineWidth = Math.max(1, scale);
  ctx.stroke();

  let x = originX + paddingX;
  let y = originY + paddingY + rowH / 2;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    ctx.fillStyle = item.color;
    ctx.fillRect(x, y - scale, swatchW, 2 * scale);
    ctx.fillStyle = "#d1d4dc";
    ctx.fillText(item.label, x + swatchW + swatchGap, y);

    if (direction === "column") {
      y += rowH + gap;
    } else {
      x += itemWidths[i] + gap;
    }
  }
}
