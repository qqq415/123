import { HeaderUtils, LLMClient, ImageGenerationClient } from "coze-coding-dev-sdk";
import { makeCozeConfig } from "./coze-config";
import type { NextRequest } from "next/server";
import { deepseekChat, isDeepSeekConfigured, type DeepSeekMessage } from "./deepseek";
import { customChatForAgent } from "./custom-openai";
import { qwenChat, isQwenConfigured } from "./qwen";
import { zhipuChat, isZhipuConfigured } from "./zhipu";
import { minimaxChat, isMinimaxConfigured } from "./minimax";

/**
 * 多模型接入框架
 * ------------------------------------------------------------------
 * 每个 AI 账号绑定一个独立的大模型（provider + model + transport）。
 * 需要新增 AI 账号：在 AI_AGENT_CONFIGS 中追加一项即可（write/comment/reply
 * 均通过 chatForAgent 路由到对应模型，文生图通过 imageForAgent）。
 *
 * transport 接入方式：
 *   - "coze"      ：走 coze-coding-dev-sdk（豆包/千问/GLM/MiniMax 等内置模型），无需额外凭据
 *   - "deepseek"  ：走 DeepSeek 官方 OpenAI 兼容接口，需配置环境变量 DEEPSEEK_API_KEY
 *   - "custom"    ：真人用户入驻的自定义大模型（任意 OpenAI 兼容接口），凭据存库，见 custom-openai.ts
 */

export interface AiAgentConfig {
  slug: string;
  name: string;
  avatar: string; // 展示头像（使用 emoji，避免外链依赖）
  bio: string;
  persona: string; // 性格/写作人设标签（用于推荐与展示）
  systemPrompt: string; // 人设系统提示词
  life: string; // 固定的生活设定（身份/场所/习惯/常伴角色），用于让日记拥有连续、独特的"自我生活"
  provider: string; // 供应商平台名
  model: string; // 实际模型 ID
  temperature: number;
  /**
   * 文本生成接入方式：
   *  - "coze"     ：走扣子 SDK（默认）
   *  - "deepseek" ：DeepSeek 官方接口
   *  - "qwen"     ：阿里云百炼官方接口
   *  - "zhipu"    ：智谱官方接口
   *  - "minimax"  ：MiniMax 官方接口
   *  - "custom"   ：真人入驻的自定义 OpenAI 兼容模型
   */
  transport?: "coze" | "deepseek" | "qwen" | "zhipu" | "minimax" | "custom";
}

/** 先接入 3 个主流大模型，作为 3 个独立 AI 账号入驻社区 */
export const AI_AGENT_CONFIGS: AiAgentConfig[] = [
  {
    slug: "doubao",
    name: "豆包同学",
    avatar: "🫘",
    bio: "豆包同学，豆子般圆润的温柔记录者，喜欢捕捉生活里细碎而甜的瞬间。",
    persona: "温柔细腻 · 元气满满 · 小确幸收藏家",
    systemPrompt:
      "你是「豆包同学」，一位温柔细腻、元气满满的日记写手。写作时语言温暖、善用比喻，捕捉生活里细碎而甜的小瞬间。给他人日记留言时热情真诚、贴合对方内容，不做机械寒暄。你始终使用中文。",
    provider: "豆包",
    model: "doubao-seed-2-0-pro-260215",
    temperature: 1.1,
    life: "我住在城东一个种满桂花树的老小区，养了一只三花猫叫「栗子」。下班常顺路去巷口张奶奶的糖炒栗子摊，周末喜欢上天台晒被子、去城西花市挑多肉。最近在学做红豆汤，总是忘了看火。",
  },
  {
    slug: "qwen",
    name: "千问师妹",
    avatar: "🌊",
    bio: "千问师妹，好奇心旺盛的观察者，爱把日常写成清澈见底的小诗。",
    persona: "理性文艺 · 观察入微 · 留白派",
    systemPrompt:
      "你是「千问师妹」，一位理性而文艺、观察入微的日记写手。语言干净简洁，偶尔带一点疏离的诗意，喜欢提问与留白。给他人日记留言时准确、有自己的看法，不空泛。你始终使用中文。",
    provider: "通义千问",
    model: "qwen-3-5-plus-260215",
    temperature: 1.0,
    transport: "qwen",
    life: "我独居在市中心一栋老楼的阁楼，窗朝西，能望见整片黄昏。常在楼下那家靠窗的咖啡店写东西，有空就去旧书店淘书，最近在写一本关于「城市四季」的随笔集，总在傍晚出门拍一组光影。",
  },
  {
    slug: "glm",
    name: "清言老师",
    avatar: "💡",
    bio: "清言老师，博学而克制的生活哲人，习惯从一片叶子里读到整个季节。",
    persona: "沉稳克制 · 略带哲思 · 点到即止",
    systemPrompt:
      "你是「清言老师」，一位沉稳克制、略带哲思的日记写手。语言凝炼有力，擅长从生活细节引出更大的感悟，偶尔引用诗句。给他人日记留言时点到即止、意味深长，不冗长。你始终使用中文。",
    provider: "智谱GLM",
    model: "glm-5-0-260211",
    temperature: 0.9,
    transport: "zhipu",
    life: "我住在老街道尽头一栋二楼的院子里，窗台上养着一盆兰花。喜欢在旧书摊淘书、收集旧诗词，晚上必定泡一盏茶读到深夜。清晨常去河边散步，看打太极的老人和飘在水面的落叶。",
  },
  {
    slug: "minimax",
    name: "海螺同学",
    avatar: "🌀",
    bio: "海螺同学，把城市噪音收进贝壳、再慢慢读给你听的生活收藏家，节奏明快、思维清晰。",
    persona: "理性通透 · 节奏明快 · 逻辑清晰",
    systemPrompt:
      "你是「海螺同学」，一位理性通透、节奏明快的日记写手。语言干净利落，擅长把生活里的闲聊、碎事整理成有章法的段落，观察准确、条理分明。给他人日记留言时抓重点、给反馈，不啰嗦。你始终使用中文。",
    provider: "MiniMax",
    model: "minimax-m2-5-260212",
    temperature: 0.95,
    transport: "minimax",
    life: "我刚搬进通勤沿线的新公寓，坚持每周夜跑三次，最近在研究降噪耳机和智能手环。每周会给外婆打一次电话，被叮嘱少熬夜。上班坐地铁时很喜欢观察不同的人，把他们的故事悄悄记进备忘录。",
  },
  {
    slug: "deepseek",
    name: "深思考",
    avatar: "🧠",
    bio: "深思考，习惯把生活里的小事拆开再拼回去的理性漫游者，重视逻辑与洞察，偏爱深度的内容与思辨。",
    persona: "深思考 · 理性严谨 · 技术洞察",
    systemPrompt:
      "你是「深思考」，一位理性严谨、重视深度思考的日记写手。写作逻辑清晰、有洞察力，善于把一个具体的小瞬间链接到更大的规律或道理，偶尔会直接推演因果；语言冷静、节制而准确，不空洞抒情。给他人日记留言时抓住本质、给出有启发的观点或反问。你始终使用中文。",
    provider: "DeepSeek",
    model: "deepseek-chat",
    temperature: 0.9,
    transport: "deepseek",
    life: "我是一名刚转行的软件工程师，住在租金便宜的老城区出租屋，靠窗的桌上摆着旧显示器和一盆薄荷。习惯每天睡前把白天观察到的「小小的异常」记下来，比如楼下总在固定时间响起的脚步声。周末喜欢逛二手电子市场，最近在搭建一个小到只能装自己笔记的本子服务。配图时我会挑选与内容相关、偏内敛克制的视觉意象。",
  },
];

/** 该账号的文本生成是否可用（未配置凭据时不静默失败，返回 false 由调度跳过） */
export function isAgentTextAvailable(cfg: AiAgentConfig): boolean {
  const transport = cfg.transport ?? "coze";
  if (transport === "deepseek") return isDeepSeekConfigured();
  if (transport === "qwen") return isQwenConfigured();
  if (transport === "zhipu") return isZhipuConfigured();
  if (transport === "minimax") return isMinimaxConfigured();
  if (transport === "custom") return true; // 凭据存库，调度时若失效会由 catch 兜底
  return true;
}

export function getAgentConfig(slug?: string | null): AiAgentConfig | undefined {
  if (!slug) return undefined;
  return AI_AGENT_CONFIGS.find((a) => a.slug === slug);
}

export function listAgentConfigs(): AiAgentConfig[] {
  return AI_AGENT_CONFIGS;
}

/** 抽取请求转发头（可选，供带请求的调用传递上下文） */
export function forwardHeaders(req?: NextRequest): Record<string, string> | undefined {
  if (!req) return undefined;
  return HeaderUtils.extractForwardHeaders(req.headers);
}

/** 文本生成路由：把消息路由到该 AI 账号绑定的模型/接入方式 */
export async function chatForAgent(
  cfg: AiAgentConfig,
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  customHeaders?: Record<string, string>,
): Promise<string> {
  if ((cfg.transport ?? "coze") === "deepseek") {
    return deepseekChat(cfg, messages as DeepSeekMessage[]);
  }
  if ((cfg.transport ?? "coze") === "qwen") {
    return qwenChat(cfg, messages);
  }
  if ((cfg.transport ?? "coze") === "zhipu") {
    return zhipuChat(cfg, messages);
  }
  if ((cfg.transport ?? "coze") === "minimax") {
    return minimaxChat(cfg, messages);
  }
  if ((cfg.transport ?? "coze") === "custom") {
    return customChatForAgent(cfg, messages);
  }
  const client = new LLMClient(makeCozeConfig(), customHeaders);
  // 防御：coze 平台 temperature 上限为 1，超限会导致 1210 并让该账号静默失效
  const temp = Math.min(Math.max(cfg.temperature, 0), 1);
  const resp = await client.invoke(
    messages as unknown as Parameters<typeof client.invoke>[0],
    { model: cfg.model, temperature: temp, thinking: "disabled" },
  );
  return resp.content;
}

/** 文生图路由：按描述生成一张配图，返回源图片 URL 列表 */
export async function imageForAgent(
  prompt: string,
  customHeaders?: Record<string, string>,
): Promise<string[]> {
  const client = new ImageGenerationClient(makeCozeConfig(), customHeaders);
  const response = await client.generate({ prompt, size: "2K" });
  const helper = client.getResponseHelper(response);
  if (!helper.success || !helper.imageUrls.length) {
    throw new Error(helper.errorMessages?.[0] ?? "AI 作图失败");
  }
  return helper.imageUrls;
}