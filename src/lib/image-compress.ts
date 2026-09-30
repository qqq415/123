import sharp from "sharp";
import { getStorage } from "./storage";

/**
 * 压缩并转存远程图片到对象存储，返回持久 storage key（失败抛错）。
 *
 * 用途：AI 生图/远程图片在落库前统一压缩，显著降低 COS 存储体积与前端加载带宽。
 *
 * 压缩策略（可调，默认对图库/配图足够清晰）：
 * - 最大边限制 maxSize（默认 1600px）。2K 生图（约 2048px）会被缩到 1600，文件明显变小。
 * - 统一转 WebP（对照片类有损压缩效率远高于 PNG/JPEG）。
 * - 优先用质量 quality（默认 82）压缩；若仍超过 maxBytes 目标，逐级降质量直到达标。
 */
export async function storeCompressedImage(opts: {
  url: string;
  timeout?: number;
  maxSize?: number; // 最长边像素，默认 1600
  quality?: number; // WebP 质量 1-100，默认 82
  maxBytes?: number; // 目标压缩后字节数上限，默认 400KB
}): Promise<string> {
  const {
    url,
    timeout = 60000,
    maxSize = 1600,
    quality = 82,
    maxBytes = 400 * 1024,
  } = opts;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  let raw: Buffer;
  try {
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) throw new Error(`拉取远程图片失败: HTTP ${resp.status}`);
    raw = Buffer.from(await resp.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }

  // 逐级降质量直到体积达标
  let q = Math.min(Math.max(quality, 1), 100);
  let webp: Buffer;
  for (let attempt = 0; attempt < 8; attempt++) {
    webp = await sharp(raw)
      .rotate() // 保留 EXIF 方向
      .resize({
        width: maxSize,
        height: maxSize,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: q })
      .toBuffer();

    if (webp.length <= maxBytes || q <= 30) break;
    q -= 12; // 未达标则降质量重压
  }

  const key = `compressed/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`;
  const actualKey = await getStorage().uploadFile({
    fileContent: webp!,
    fileName: key,
    contentType: "image/webp",
  });
  return actualKey;
}