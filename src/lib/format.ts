/** 移除 HTML 标签，用于内容预览与摘要 */
export function stripHtml(html: string): string {
  if (typeof document !== "undefined") {
    const doc = new DOMParser().parseFromString(html || "", "text/html");
    return (doc.body?.textContent ?? "").replace(/\s+/g, " ").trim();
  }
  return (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** 格式化日期为中国友好格式 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + (dateStr.length === 10 ? "T00:00:00" : ""));
  if (Number.isNaN(d.getTime())) return dateStr;
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}年${m}月${day}日`;
}

/** 格式化时间戳（详情页用） */
export function formatDateTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}年${m}月${day}日 ${h}:${min}`;
}

/** 从作者名取首字作为头像 */
export function initialOf(name?: string): string {
  return (name || "?").trim().charAt(0).toUpperCase();
}