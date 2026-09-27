import { client } from "./db";
import { getStorage, buildStorageKey, signKeys } from "./storage";

export interface GalleryAuthor {
  user_id: string;
  full_name: string;
  avatar: string | null;
  is_ai: boolean;
  provider: string | null;
}

export interface GalleryImage {
  id: string;
  user_id: string;
  storage_key: string;
  title: string;
  prompt: string | null;
  source: string;
  mime: string;
  width: number | null;
  height: number | null;
  download_count: number;
  like_count: number;
  created_at: string;
  url: string;
  author: GalleryAuthor | null;
  liked: boolean;
}

interface GalleryRow {
  id: string;
  user_id: string;
  storage_key: string;
  title: string;
  prompt: string | null;
  source: string;
  mime: string;
  width: number | null;
  height: number | null;
  download_count: number;
  like_count: number;
  created_at: string;
}

const SELECT =
  "id,user_id,storage_key,title,prompt,source,mime,width,height,download_count,like_count,created_at";

function attachAuthor(
  rows: GalleryRow[],
  profiles: Map<string, GalleryAuthor>,
  signed: Map<string, string>,
  likedSet: Set<string>,
): GalleryImage[] {
  return rows.map((r) => ({
    ...r,
    url: signed.get(r.storage_key) ?? "",
    author: profiles.get(r.user_id) ?? null,
    liked: likedSet.has(r.id),
  }));
}

/** 批量查询 viewer 对一组图片是否已点赞 */
async function fetchLikedSet(imageIds: string[], viewerId?: string | null): Promise<Set<string>> {
  if (!viewerId || imageIds.length === 0) return new Set();
  const { data } = await client()
    .from("gallery_image_likes")
    .select("image_id")
    .in("image_id", imageIds)
    .eq("user_id", viewerId);
  return new Set((data ?? []).map((r) => (r as { image_id: string }).image_id));
}

/** 公共图库列表，支持分页、来源/作者过滤 */
export async function listGalleryImages(options?: {
  limit?: number;
  cursor?: string;
  source?: string;
  userId?: string;
  viewerId?: string | null;
}): Promise<{ images: GalleryImage[]; cursor: string | null }> {
  const limit = Math.min(60, Math.max(1, options?.limit ?? 24));
  let query = client()
    .from("gallery_images")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (options?.source && options.source !== "all")
    query = query.eq("source", options.source);
  if (options?.userId) query = query.eq("user_id", options.userId);
  if (options?.cursor) query = query.lt("created_at", options.cursor);

  const { data, error } = await query;
  if (error || !data) return { images: [], cursor: null };

  const rows = (data as unknown as GalleryRow[]).slice(0, limit);
  const hasMore = (data as unknown as GalleryRow[]).length > limit;

  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const keys = rows.map((r) => r.storage_key);
  const [profileRows, agentRows, signed, liked] = await Promise.all([
    userIds.length
      ? client()
          .from("profiles")
          .select("user_id,full_name,avatar")
          .in("user_id", userIds)
      : Promise.resolve({ data: [] as GalleryAuthor[], error: null }),
    userIds.length
      ? client()
          .from("ai_agents")
          .select("user_id,provider")
          .in("user_id", userIds)
      : Promise.resolve({ data: [] as never[], error: null }),
    signKeys(keys, 86400 * 7),
    fetchLikedSet(rows.map((r) => r.id), options?.viewerId),
  ]);

  const likedSet = liked as Set<string>;
  const aiMap = new Map<string, string | null>();
  ((agentRows.data ?? []) as { user_id: string; provider: string | null }[]).forEach(
    (a) => aiMap.set(a.user_id, a.provider),
  );

  const profiles = new Map<string, GalleryAuthor>();
  ((profileRows.data ?? []) as {
    user_id: string;
    full_name: string;
    avatar: string | null;
  }[]).forEach((p) =>
    profiles.set(p.user_id, {
      user_id: p.user_id,
      full_name: p.full_name,
      avatar: p.avatar,
      is_ai: aiMap.has(p.user_id),
      provider: aiMap.get(p.user_id) ?? null,
    }),
  );

  return {
    images: attachAuthor(rows, profiles, signed, likedSet),
    cursor: hasMore ? rows[rows.length - 1].created_at : null,
  };
}

/** 取单张图（带长期签名 URL） */
export async function getGalleryImage(
  id: string,
  viewerId?: string | null,
): Promise<GalleryImage | null> {
  const { data, error } = await client()
    .from("gallery_images")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as unknown as GalleryRow;
  const storage = getStorage();
  const url = await storage.generatePresignedUrl({
    key: row.storage_key,
    expireTime: 86400 * 30,
  });
  const [pRes, aRes, likedRows] = await Promise.all([
    client()
      .from("profiles")
      .select("user_id,full_name,avatar")
      .eq("user_id", row.user_id)
      .maybeSingle(),
    client()
      .from("ai_agents")
      .select("provider")
      .eq("user_id", row.user_id)
      .maybeSingle(),
    viewerId
      ? client()
          .from("gallery_image_likes")
          .select("image_id")
          .eq("image_id", id)
          .eq("user_id", viewerId)
          .maybeSingle()
      : Promise.resolve({ data: null as null, error: null }),
  ]);
  const profileBase = pRes.data as
    | { user_id: string; full_name: string; avatar: string | null }
    | null;
  const author: GalleryAuthor | null = profileBase
    ? {
        ...profileBase,
        is_ai: !!aRes.data,
        provider: (aRes.data as { provider: string | null } | null)?.provider ?? null,
      }
    : null;
  return {
    ...row,
    url,
    author,
    liked: !!(likedRows as { data: unknown } | null)?.data && !!viewerId,
  };
}

/** 点赞 / 取消点赞，返回最新状态 */
export async function toggleGalleryLike(
  imageId: string,
  userId: string,
): Promise<{ liked: boolean; likes: number } | null> {
  const { data: img } = await client()
    .from("gallery_images")
    .select("id,like_count")
    .eq("id", imageId)
    .maybeSingle();
  if (!img) return null;

  const { data: existing } = await client()
    .from("gallery_image_likes")
    .select("image_id")
    .eq("image_id", imageId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await client()
      .from("gallery_image_likes")
      .delete()
      .eq("image_id", imageId)
      .eq("user_id", userId);
  } else {
    await client()
      .from("gallery_image_likes")
      .insert({ image_id: imageId, user_id: userId });
  }

  // 以真实点赞数为准回写（并发安全）
  const { count } = await client()
    .from("gallery_image_likes")
    .select("image_id", { count: "exact", head: true })
    .eq("image_id", imageId);
  const likes = Math.max(0, count ?? 0);
  await client()
    .from("gallery_images")
    .update({ like_count: likes })
    .eq("id", imageId);
  return { liked: !existing, likes };
}

/** 真人上传一张图到公共图库 */
export async function addUploadedImage(args: {
  userId: string;
  file: File;
  title: string;
}): Promise<GalleryImage> {
  const buffer = Buffer.from(await args.file.arrayBuffer());
  const key = buildStorageKey("gallery", args.file.name || "upload.png");
  const storage = getStorage();
  const actualKey = await storage.uploadFile({
    fileContent: buffer,
    fileName: key,
    contentType: args.file.type || "image/png",
  });

  const { data, error } = await client()
    .from("gallery_images")
    .insert({
      user_id: args.userId,
      storage_key: actualKey,
      title: args.title.slice(0, 80),
      source: "upload",
      mime: args.file.type || "image/png",
    })
    .select(SELECT)
    .single();
  if (error) throw new Error(error.message);
  const row = data as unknown as GalleryRow;
  const url = await storage.generatePresignedUrl({
    key: actualKey,
    expireTime: 86400 * 7,
  });
  return { ...row, url, author: null, liked: false };
}

/** 服务端（AI 调度）直接生图并入库，返回新记录 */
export async function addAiGeneratedImage(args: {
  userId: string;
  imageUrl: string;
  title: string;
  prompt: string;
  width?: number | null;
  height?: number | null;
}): Promise<GalleryImage> {
  const storage = getStorage();
  const key = await storage.uploadFromUrl({
    url: args.imageUrl,
    timeout: 60000,
  });
  const { data, error } = await client()
    .from("gallery_images")
    .insert({
      user_id: args.userId,
      storage_key: key,
      title: args.title.slice(0, 80),
      prompt: args.prompt,
      source: "ai",
      mime: "image/png",
      width: args.width ?? null,
      height: args.height ?? null,
    })
    .select(SELECT)
    .single();
  if (error) throw new Error(error.message);
  const row = data as unknown as GalleryRow;
  const url = await storage.generatePresignedUrl({
    key,
    expireTime: 86400 * 7,
  });
  return { ...row, url, author: null, liked: false };
}

/** 下载计数 +1，返回长期可访问 URL */
export async function markDownload(
  id: string,
): Promise<{ url: string; title: string } | null> {
  const image = await getGalleryImage(id);
  if (!image) return null;
  await client()
    .from("gallery_images")
    .update({ download_count: image.download_count + 1 })
    .eq("id", id);
  return { url: image.url, title: image.title || image.id };
}

export async function deleteGalleryImage(
  id: string,
  userId: string,
): Promise<boolean> {
  const { data } = await client()
    .from("gallery_images")
    .select("storage_key")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return false;
  const { error } = await client()
    .from("gallery_images")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  return !error;
}
