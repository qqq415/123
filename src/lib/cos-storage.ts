import COS from "cos-nodejs-sdk-v5";

/** 与沙箱 S3Storage 对齐的存储后端接口 */
export interface StorageBackend {
  uploadFile(opts: {
    fileContent: Buffer | Uint8Array;
    fileName: string;
    contentType: string;
  }): Promise<string>;
  generatePresignedUrl(opts: { key: string; expireTime: number }): Promise<string>;
  uploadFromUrl(opts: { url: string; timeout?: number }): Promise<string>;
}

interface CosConfig {
  secretId: string;
  secretKey: string;
  bucket: string;
  region: string;
  /** 对象是否走公有读永久 URL（true 时不返回会过期的签名地址） */
  publicRead: boolean;
  /** URL 协议，默认 https */
  protocol: string;
}

/** 读取并校验腾讯云 COS 配置，缺少必填项返回 null */
export function readCosConfig(): CosConfig | null {
  const secretId = process.env.COS_SECRET_ID?.trim();
  const secretKey = process.env.COS_SECRET_KEY?.trim();
  const bucket = process.env.COS_BUCKET?.trim();
  const region = process.env.COS_REGION?.trim();
  if (!secretId || !secretKey || !bucket || !region) return null;
  return {
    secretId,
    secretKey,
    bucket,
    region,
    publicRead: /^(1|true|yes|on)$/i.test(process.env.COS_PUBLIC_READ?.trim() ?? ""),
    protocol: process.env.COS_PROTOCOL?.trim() === "http" ? "http:" : "https:",
  };
}

/** 判断当前是否配置并启用了腾讯云 COS */
export function isCosEnabled(): boolean {
  return readCosConfig() !== null;
}

function safeKey(key: string): string {
  return key.replace(/^\/+/, "");
}

/** 腾讯云 COS 存储后端，接口与 S3Storage 完全一致 */
export class CosStorage implements StorageBackend {
  private readonly client: COS;
  private readonly cfg: CosConfig;

  constructor(config?: CosConfig) {
    const cfg = config ?? readCosConfig();
    if (!cfg) throw new Error("腾讯云 COS 配置不完整");
    this.cfg = cfg;
    this.client = new COS({
      SecretId: cfg.secretId,
      SecretKey: cfg.secretKey,
    });
  }

  /** 上传 Buffer，返回对象 key */
  async uploadFile(opts: {
    fileContent: Buffer | Uint8Array;
    fileName: string;
    contentType: string;
  }): Promise<string> {
    const Key = safeKey(opts.fileName);
    await this.client.putObject({
      Bucket: this.cfg.bucket,
      Region: this.cfg.region,
      Key,
      Body: opts.fileContent as Buffer,
      ContentType: opts.contentType || "application/octet-stream",
    });
    return Key;
  }

  /** 生成签名 URL；若开启公有读，则返回永久公共地址（忽略 expireTime） */
  async generatePresignedUrl(opts: { key: string; expireTime: number }): Promise<string> {
    const Key = safeKey(opts.key);
    if (this.cfg.publicRead) {
      return `${this.cfg.protocol}//${this.cfg.bucket}.cos.${this.cfg.region}.myqcloud.com/${
        encodeURI(Key).replace(/%2F/g, "/")
      }`;
    }
    const url = this.client.getObjectUrl({
      Bucket: this.cfg.bucket,
      Region: this.cfg.region,
      Key,
      Sign: true,
      Expires: Math.max(1, Math.floor(opts.expireTime)),
      Protocol: this.cfg.protocol,
    });
    return url;
  }

  /** 从远程 URL 拉取内容并转存到 COS，返回新对象 key */
  async uploadFromUrl(opts: { url: string; timeout?: number }): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeout ?? 60000);
    try {
      const resp = await fetch(opts.url, { signal: controller.signal });
      if (!resp.ok) throw new Error(`拉取远程图片失败: HTTP ${resp.status}`);
      const arrayBuf = await resp.arrayBuffer();
      const contentType = resp.headers.get("content-type") || "image/jpeg";
      const key = `remote/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
      await this.uploadFile({
        fileContent: Buffer.from(arrayBuf),
        fileName: key,
        contentType,
      });
      return key;
    } finally {
      clearTimeout(timer);
    }
  }
}
