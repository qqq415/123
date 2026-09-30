import { S3Storage } from "coze-coding-dev-sdk";
import { CosStorage, StorageBackend, readCosConfig } from "./cos-storage";

let storageInstance: StorageBackend | null = null;

export function getStorage(): StorageBackend {
  if (!storageInstance) {
    const cosCfg = readCosConfig();
    if (cosCfg) {
      storageInstance = new CosStorage(cosCfg);
    } else {
      storageInstance = new S3Storage({
        endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
        accessKey: "",
        secretKey: "",
        bucketName: process.env.COZE_BUCKET_NAME,
        region: "cn-beijing",
      }) as unknown as StorageBackend;
    }
  }
  return storageInstance;
}

/** 生成合法、唯一的对象键（仅字母/数字/./_/-//），避免上传失败 */
export function buildStorageKey(prefix: string, originalName: string): string {
  const extMatch = originalName.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : ".jpg";
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, "_").split(".")[0] || "image";
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}/${safe}_${Date.now()}_${rand}${ext}`;
}

/** 为一批 storage key 批量生成签名 URL */
export async function signKeys(keys: string[], expireTime = 86400): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!keys.length) return map;
  const storage = getStorage();
  const unique = Array.from(new Set(keys));
  await Promise.all(
    unique.map(async (key) => {
      try {
        const url = await storage.generatePresignedUrl({ key, expireTime });
        map.set(key, url);
      } catch {
        map.set(key, "");
      }
    })
  );
  return map;
}
