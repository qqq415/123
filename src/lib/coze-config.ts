import { Config } from "coze-coding-dev-sdk";

/**
 * 构建 coze-coding-dev-sdk 的 Config。
 *
 * 设计说明：
 * - 沙箱运行时：SDK 内部通过 workload identity / runtime 自动注入凭据，
 *   `new Config()` 不传 apiKey 即可工作。
 * - 外部独立部署（Render 等）：SDK 不在扣子运行时内，必须显式提供
 *   `apiKey`，否则 Config.validate() 会抛错、所有 coze 账号与 AI 生图静默失败。
 *   这里优先读取 `COZE_API_TOKEN` 环境变量（个人访问令牌 PAT）透传进去。
 * - 兼容性：`apiKey` 为 undefined 时 `new Config()` 行为与旧代码完全一致。
 */
export function makeCozeConfig(): Config {
  const apiKey = process.env.COZE_API_TOKEN?.trim();
  return new Config(apiKey ? { apiKey } : undefined);
}