import type { GarnishType, GlassType } from "@/lib/drinks";

/**
 * PixelDrink —— 程序化像素风酒款配图
 * ------------------------------------------------------------------
 * 杯壁来自手工绘制的 16×16 点阵（GLASS_MAPS），酒液根据 fill 高度从杯底
 * 向上填充「杯壁之间」的空格，并按行做明暗渐变；泡沫、装饰（樱桃/柑橘/
 * 薄荷/伞/冰块/花瓣等）以像素块叠加。整体使用 SVG <rect>，shape-rendering
 * =crispEdges 保证锐利的像素感。
 */

const W = 16;
const H = 16;

/** 把一行点阵规整为恰好 W 列（居中补 '.'），避免手写行长度不一致 */
function row(s: string): string {
  if (s.length >= W) return s.slice(0, W);
  const total = W - s.length;
  const left = Math.floor(total / 2);
  return ".".repeat(left) + s + ".".repeat(total - left);
}

/* 杯壁点阵：'#' = 杯壁，其余为空格（内部/外部） */
const GLASS_MAPS: Record<GlassType, string[]> = {
  // 古典矮杯
  rocks: [
    "................",
    ".##############.",
    ".#............#.",
    ".#............#.",
    ".#............#.",
    ".#............#.",
    ".#............#.",
    ".#............#.",
    ".#............#.",
    ".#............#.",
    ".#............#.",
    ".#............#.",
    ".#............#.",
    ".##############.",
    "................",
    "................",
  ].map(row),
  // 高脚葡萄酒杯
  wine: [
    "",
    ".############.",
    ".#..........#.",
    ".#..........#.",
    "..#........#..",
    "..#........#..",
    "...#......#...",
    "...#......#...",
    "....#....#....",
    ".....#..#.....",
    "......##......",
    ".......#......",
    ".......#......",
    "....####....",
    "",
    "",
  ].map(row),
  // 马天尼三角杯
  martini: [
    "",
    ".############.",
    ".#..........#.",
    "..#........#..",
    "..#........#..",
    "...#......#...",
    "...#......#...",
    "....#....#....",
    ".....#..#.....",
    "......##......",
    ".......#......",
    ".......#......",
    ".......#......",
    "....####....",
    "",
    "",
  ].map(row),
  // 长笛香槟杯
  flute: [
    "",
    "..##########..",
    "..#........#..",
    "..#........#..",
    "..#........#..",
    "..#........#..",
    "..#........#..",
    "..#........#..",
    "..#........#..",
    "..#........#..",
    "...#......#...",
    "....####....",
    ".......#......",
    "...######...",
    "",
    "",
  ].map(row),
  // 啤酒扎杯（右侧带把手）
  mug: [
    "................",
    ".############..",
    ".#..........##.",
    ".#..........#.#",
    ".#..........##.",
    ".#............#.",
    ".#............#.",
    ".#............#.",
    ".#............#.",
    ".#............#.",
    ".#............#.",
    ".#............#.",
    ".#............#.",
    ".############.",
    "................",
    "................",
  ].map(row),
  // 直身高球杯
  highball: [
    "................",
    ".##############.",
    ".#............#.",
    ".#............#.",
    ".#............#.",
    ".#............#.",
    ".#............#.",
    ".#............#.",
    ".#............#.",
    ".#............#.",
    ".#............#.",
    ".#............#.",
    ".#............#.",
    ".##############.",
    "................",
    "................",
  ].map(row),
  // 小盏（清酒杯）
  cup: [
    "",
    "",
    "",
    ".############.",
    ".#..........#.",
    ".#..........#.",
    "..#........#..",
    "..#........#..",
    "..#........#..",
    "...#......#...",
    "...#......#...",
    "....####....",
    "",
    "",
    "",
    "",
  ].map(row),
  // 烈酒杯
  shot: [
    "",
    "",
    ".############.",
    ".#..........#.",
    ".#..........#.",
    ".#..........#.",
    ".#..........#.",
    ".#..........#.",
    ".#..........#.",
    ".#..........#.",
    ".############.",
    "",
    "",
    "",
    "",
    "",
  ].map(row),
};

/* 每款杯型的「内部填充行」范围（在点阵中，酒液允许出现的行） */
const FILL_BOUNDS: Record<GlassType, { top: number; bottom: number }> = {
  rocks: { top: 2, bottom: 12 },
  wine: { top: 2, bottom: 9 },
  martini: { top: 2, bottom: 8 },
  flute: { top: 2, bottom: 10 },
  mug: { top: 2, bottom: 12 },
  highball: { top: 2, bottom: 12 },
  cup: { top: 4, bottom: 10 },
  shot: { top: 3, bottom: 9 },
};

interface PixelDrinkProps {
  glass: GlassType;
  garnish: GarnishType;
  fill: number; // 0~1
  colors: {
    liquid: string;
    liquidDark: string;
    liquidLight: string;
    glass: string;
    foam?: string;
  };
  size?: number; // 渲染边长 px
  className?: string;
  pixel?: number; // 每个逻辑像素的实际大小（默认由 size 决定）
}

function shadeAt(
  rowRatio: number,
  c: PixelDrinkProps["colors"],
): string {
  // 上部偏亮、下部偏暗
  if (rowRatio < 0.3) return c.liquidLight;
  if (rowRatio > 0.7) return c.liquidDark;
  return c.liquid;
}

export function PixelDrink({
  glass,
  garnish,
  fill,
  colors,
  size = 160,
  className,
}: PixelDrinkProps) {
  const map = GLASS_MAPS[glass];
  const bounds = FILL_BOUNDS[glass];
  const span = bounds.bottom - bounds.top + 1;
  const fillRows = Math.round(Math.min(1, Math.max(0, fill)) * span);
  const liquidTopRow = bounds.bottom - fillRows + 1;

  const rects: { x: number; y: number; color: string; key: string }[] = [];

  // 1) 酒液：在杯壁之间、且位于液面以下的空格填色
  for (let r = bounds.top; r <= bounds.bottom; r++) {
    const line = map[r];
    let left = -1;
    let right = -1;
    for (let c = 0; c < W; c++) {
      if (line[c] === "#") {
        if (left === -1) left = c;
        right = c;
      }
    }
    if (left === -1 || right === -1) continue;
    if (r < liquidTopRow) continue;
    const ratio = (r - bounds.top) / Math.max(1, span - 1);
    for (let c = left + 1; c < right; c++) {
      if (line[c] !== ".") continue;
      rects.push({
        x: c,
        y: r,
        color: shadeAt(ratio, colors),
        key: `l-${r}-${c}`,
      });
    }
  }

  // 2) 液面一层浅色（更亮的水平面）
  if (fillRows > 0) {
    const r = liquidTopRow;
    const line = map[r];
    let left = -1;
    let right = -1;
    for (let c = 0; c < W; c++) {
      if (line[c] === "#") {
        if (left === -1) left = c;
        right = c;
      }
    }
    for (let c = left + 1; c < right; c++) {
      if (line[c] !== ".") continue;
      rects.push({ x: c, y: r, color: colors.liquidLight, key: `surf-${c}` });
    }
  }

  // 3) 泡沫（啤酒顶部 1~2 行）
  if (colors.foam && fillRows > 1) {
    for (let r = liquidTopRow; r <= liquidTopRow + 1; r++) {
      const line = map[r];
      let left = -1;
      let right = -1;
      for (let c = 0; c < W; c++) {
        if (line[c] === "#") {
          if (left === -1) left = c;
          right = c;
        }
      }
      for (let c = left + 1; c < right; c++) {
        if (line[c] !== ".") continue;
        // 泡沫留点空隙更自然
        if ((r + c) % 3 === 0 && r !== liquidTopRow) continue;
        rects.push({ x: c, y: r, color: colors.foam!, key: `foam-${r}-${c}` });
      }
    }
  }

  // 4) 杯壁
  for (let r = 0; r < H; r++) {
    const line = map[r];
    for (let c = 0; c < W; c++) {
      if (line[c] === "#") {
        rects.push({ x: c, y: r, color: colors.glass, key: `g-${r}-${c}` });
      }
    }
  }

  // 5) 装饰（坐标基于 16×16 网格）
  const deco = buildGarnish(garnish);
  deco.forEach((d, i) =>
    rects.push({ ...d, key: `d-${i}-${d.x}-${d.y}` }),
  );

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      shapeRendering="crispEdges"
      role="img"
      aria-label="像素风酒款配图"
    >
      {rects.map((r) => (
        <rect x={r.x} y={r.y} width={1} height={1} fill={r.color} key={r.key} />
      ))}
    </svg>
  );
}

/* ---------------- 装饰物 ---------------- */

interface DecoRect {
  x: number;
  y: number;
  color: string;
}

function buildGarnish(type: GarnishType): DecoRect[] {
  switch (type) {
    case "cherry":
      return [
        { x: 12, y: 1, color: "#F07884" },
        { x: 13, y: 1, color: "#D23A4A" },
        { x: 12, y: 2, color: "#A01E2E" },
        { x: 13, y: 2, color: "#A01E2E" },
        { x: 13, y: 0, color: "#5E8C3A" },
      ];
    case "lemon":
      return wedge(12, 0, "#F2D34A", "#D9A92A");
    case "lime":
      return wedge(12, 0, "#A8C93E", "#7C9A22");
    case "orange":
      return wedge(12, 0, "#F2913D", "#D96B22");
    case "mint":
      return [
        { x: 3, y: 0, color: "#5E8C3A" },
        { x: 4, y: 0, color: "#7CAC4E" },
        { x: 3, y: 1, color: "#7CAC4E" },
        { x: 4, y: 1, color: "#5E8C3A" },
        { x: 2, y: 1, color: "#5E8C3A" },
      ];
    case "berry":
      return [
        { x: 12, y: 1, color: "#8E2440" },
        { x: 13, y: 1, color: "#B8486A" },
        { x: 11, y: 2, color: "#8E2440" },
        { x: 12, y: 2, color: "#B8486A" },
      ];
    case "flower":
      return [
        { x: 12, y: 0, color: "#E8B93E" },
        { x: 11, y: 1, color: "#F6D878" },
        { x: 12, y: 1, color: "#E8B93E" },
        { x: 13, y: 1, color: "#F6D878" },
        { x: 12, y: 2, color: "#B88820" },
      ];
    case "umbrella":
      return [
        { x: 10, y: 0, color: "#D86A7E" },
        { x: 11, y: 0, color: "#EE9AAB" },
        { x: 12, y: 0, color: "#D86A7E" },
        { x: 13, y: 0, color: "#EE9AAB" },
        { x: 12, y: 1, color: "#C9A060" },
        { x: 12, y: 2, color: "#C9A060" },
      ];
    case "salt":
      return [
        { x: 4, y: 2, color: "#FBF6EA" },
        { x: 6, y: 2, color: "#EFE7D6" },
        { x: 9, y: 2, color: "#FBF6EA" },
      ];
    case "ice":
      return [
        { x: 5, y: 3, color: "#DDEFF5" },
        { x: 6, y: 3, color: "#C2DEE9" },
        { x: 5, y: 4, color: "#C2DEE9" },
        { x: 9, y: 4, color: "#DDEFF5" },
        { x: 10, y: 4, color: "#C2DEE9" },
        { x: 9, y: 5, color: "#C2DEE9" },
      ];
    case "bubble":
      return [
        { x: 5, y: 6, color: "#FBEFD2" },
        { x: 9, y: 8, color: "#FBEFD2" },
        { x: 6, y: 10, color: "#F6E6C0" },
      ];
    case "petal":
      return [
        { x: 4, y: 2, color: "#FBD0DB" },
        { x: 11, y: 3, color: "#FBD0DB" },
        { x: 7, y: 1, color: "#F2A7B8" },
      ];
    case "none":
    default:
      return [];
  }
}

/** 杯沿的柑橘角（3×2 的小三角） */
function wedge(x: number, y: number, light: string, dark: string): DecoRect[] {
  return [
    { x, y, color: light },
    { x: x + 1, y, color: light },
    { x: x + 2, y, color: light },
    { x: x + 1, y: y + 1, color: dark },
    { x: x + 2, y: y + 1, color: dark },
  ];
}
