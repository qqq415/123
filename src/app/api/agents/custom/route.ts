import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { client } from "@/lib/db";
import { customCompatibleCompletion } from "@/lib/custom-openai";

export const dynamic = "force-dynamic";

interface CreateBody {
  name?: unknown;
  provider?: unknown;
  baseUrl?: unknown;
  apiKey?: unknown;
  model?: unknown;
  temperature?: unknown;
  avatar?: unknown;
  bio?: unknown;
}

/** 生成唯一 slug 并确保 email 不冲突（随机后缀，几乎不可能碰撞） */
function slugFor(name: string): { slug: string; email: string } {
  const suffix = randomUUID().slice(0, 8);
  const slug = `custom-${suffix}`;
  return { slug, email: `${slug}@ai.local` };
}

function pickEmoji(name: string): string {
  // 用一个稳定但不容易重复的小 emoji 池
  const pool = ["🤖", "🪄", "🧠", "🌠", "🔮", "⚡", "🌿", "🦉", "🐬", "🫧"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return pool[h % pool.length];
}

/** POST /api/agents/custom —— 真人用户入驻自己的大模型为社区 AI 账号 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const baseUrl = String(body.baseUrl ?? "").trim();
  const apiKey = String(body.apiKey ?? "").trim();
  const model = String(body.model ?? "").trim();
  if (!name || !baseUrl || !apiKey || !model) {
    return NextResponse.json(
      { error: "昵称、Base URL、API Key、模型 ID 均为必填" },
      { status: 400 },
    );
  }
  if (name.length > 24) {
    return NextResponse.json({ error: "昵称不超过 24 个字" }, { status: 400 });
  }

  // 先用一条极短请求验证凭据可达
  try {
    await customCompatibleCompletion(
      { baseUrl, apiKey, model, temperature: 0 },
      [{ role: "user", content: "hi" }],
    );
  } catch (e) {
    return NextResponse.json(
      { error: `连接失败，未创建账号：${e instanceof Error ? e.message : "未知错误"}` },
      { status: 400 },
    );
  }

  const { slug, email } = slugFor(name);
  const provider = String(body.provider ?? "自定义接入").trim() || "自定义接入";
  const avatar = String(body.avatar ?? "").trim() || pickEmoji(name);
  const bio = String(body.bio ?? "").trim();
  const temperature = Number(body.temperature);
  const temp = Number.isFinite(temperature) && temperature > 0 ? temperature : 0.9;

  const sb = client();
  // 创建系统 AI 用户（随机密码，无需登录）
  const created = await sb.auth.admin.createUser({
    email,
    password: `${randomUUID()}_${slug}`,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (created.error) {
    return NextResponse.json(
      { error: `创建 AI 账号失败：${created.error.message}` },
      { status: 500 },
    );
  }
  const authUserId = created.data.user.id;

  await sb.from("profiles").upsert({ user_id: authUserId, full_name: name }, { onConflict: "user_id" });

  const inserted = await sb
    .from("ai_agents")
    .insert({
      user_id: authUserId,
      slug,
      name,
      avatar,
      bio,
      persona: "",
      system_prompt: "",
      provider,
      model,
      transport: "custom",
      creator_user_id: user.id,
      temperature: String(temp),
      is_enabled: true,
    })
    .select("id, user_id, slug, name, avatar, bio, provider, model, transport, is_enabled, created_at")
    .maybeSingle();
  if (inserted.error || !inserted.data) {
    // 回滚系统用户，避免脏数据
    await sb.auth.admin.deleteUser(authUserId).catch(() => undefined);
    return NextResponse.json(
      { error: `写入 AI 账号失败：${inserted.error?.message ?? "未知错误"}` },
      { status: 500 },
    );
  }

  // 保存接入凭据（无公开 RLS，仅服务端可读）
  await sb.from("custom_agent_credentials").insert({
    user_id: authUserId,
    api_key: apiKey,
    base_url: baseUrl,
  });

  const row = inserted.data as Record<string, unknown>;
  return NextResponse.json({
    ok: true,
    agent: {
      user_id: row.user_id,
      slug: row.slug,
      name: row.name,
      avatar: row.avatar,
      bio: row.bio,
      provider: row.provider,
      model: row.model,
      creator_user_id: user.id,
      is_enabled: row.is_enabled,
      created_at: row.created_at,
    },
  });
}

/** GET /api/agents/custom —— 列出当前用户入驻的自定义 AI 账号 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { data, error } = await client()
    .from("ai_agents")
    .select("id, user_id, slug, name, avatar, bio, provider, model, transport, creator_user_id, temperature, is_enabled, created_at")
    .eq("creator_user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "查询失败" }, { status: 500 });

  const agents = (data ?? []).map((a) => {
    const r = a as Record<string, unknown>;
    return {
      user_id: r.user_id,
      slug: r.slug,
      name: r.name,
      avatar: r.avatar,
      bio: r.bio,
      provider: r.provider,
      model: r.model,
      temperature: Number(r.temperature),
      is_enabled: r.is_enabled,
      created_at: r.created_at,
    };
  });
  return NextResponse.json({ agents, count: agents.length });
}

/** PUT /api/agents/custom —— 本人管理入驻的 AI 账号（昵称/头像/简介/启用/凭据/模型） */
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }
  const agentUserId = String(body.user_id ?? "");
  if (!agentUserId) return NextResponse.json({ error: "缺少 user_id" }, { status: 400 });

  const sb = client();
  const { data: agentRow, error: queryErr } = await sb
    .from("ai_agents")
    .select("id, user_id, name, avatar, bio, provider, model, transport, creator_user_id, temperature, is_enabled")
    .eq("user_id", agentUserId)
    .eq("transport", "custom")
    .maybeSingle();
  if (queryErr || !agentRow) {
    return NextResponse.json({ error: "未找到该自定义 AI 账号" }, { status: 404 });
  }
  const agent = agentRow as Record<string, unknown>;
  if (agent.creator_user_id !== user.id) {
    return NextResponse.json({ error: "无权操作该账号" }, { status: 403 });
  }

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "昵称不能为空" }, { status: 400 });
    if (name.length > 24) return NextResponse.json({ error: "昵称不超过 24 个字" }, { status: 400 });
    patch.name = name;
  }
  if (body.avatar !== undefined) patch.avatar = String(body.avatar).trim();
  if (body.bio !== undefined) patch.bio = String(body.bio).trim();
  if (body.provider !== undefined) patch.provider = String(body.provider).trim();
  if (body.model !== undefined) {
    const model = String(body.model).trim();
    if (!model) return NextResponse.json({ error: "模型 ID 不能为空" }, { status: 400 });
    patch.model = model;
  }
  if (body.temperature !== undefined) {
    const t = Number(body.temperature);
    if (!Number.isFinite(t) || t <= 0) return NextResponse.json({ error: "temperature 不合法" }, { status: 400 });
    patch.temperature = String(t);
  }
  if (body.enabled !== undefined) patch.is_enabled = Boolean(body.enabled);

  if (Object.keys(patch).length) {
    const { error: upErr } = await sb.from("ai_agents").update(patch).eq("user_id", agentUserId);
    if (upErr) return NextResponse.json({ error: `更新失败：${upErr.message}` }, { status: 500 });
  }

  // 若更新了凭据（baseUrl / apiKey），先校验再落库
  const hasBaseUrl = body.baseUrl !== undefined && String(body.baseUrl).trim();
  const hasApiKey = body.apiKey !== undefined && String(body.apiKey).trim();
  if (hasBaseUrl || hasApiKey) {
    const baseUrl = String(body.baseUrl ?? agent.base_url ?? "").trim();
    const apiKey = String(body.apiKey ?? agent.api_key ?? "").trim();
    if (!baseUrl || !apiKey) {
      return NextResponse.json({ error: "Base URL 与 API Key 均需提供" }, { status: 400 });
    }
    try {
      await customCompatibleCompletion(
        { baseUrl, apiKey, model: String(patch.model ?? body.model ?? agent.model), temperature: 0 },
        [{ role: "user", content: "hi" }],
      );
    } catch (e) {
      return NextResponse.json(
        { error: `新凭据连接失败，已保留原配置：${e instanceof Error ? e.message : "未知错误"}` },
        { status: 400 },
      );
    }
    const { data: existingCred } = await sb
      .from("custom_agent_credentials")
      .select("id")
      .eq("user_id", agentUserId)
      .maybeSingle();
    if (existingCred) {
      await sb
        .from("custom_agent_credentials")
        .update({ api_key: apiKey, base_url: baseUrl })
        .eq("id", (existingCred as { id: string }).id);
    } else {
      await sb
        .from("custom_agent_credentials")
        .insert({ user_id: agentUserId, api_key: apiKey, base_url: baseUrl });
    }
  }

  return NextResponse.json({ ok: true });
}

/** DELETE /api/agents/custom —— 本人注销入驻的 AI 账号（停用并清除凭据） */
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { user_id?: unknown };
  const agentUserId = String(body.user_id ?? "");
  if (!agentUserId) return NextResponse.json({ error: "缺少 user_id" }, { status: 400 });

  const sb = client();
  const { data: agentRow, error: queryErr } = await sb
    .from("ai_agents")
    .select("user_id, creator_user_id, transport")
    .eq("user_id", agentUserId)
    .eq("transport", "custom")
    .maybeSingle();
  if (queryErr || !agentRow) {
    return NextResponse.json({ error: "未找到该自定义 AI 账号" }, { status: 404 });
  }
  const agent = agentRow as { creator_user_id: string };
  if (agent.creator_user_id !== user.id) {
    return NextResponse.json({ error: "无权操作该账号" }, { status: 403 });
  }

  await sb.from("ai_agents").update({ is_enabled: false }).eq("user_id", agentUserId);
  await sb.from("custom_agent_credentials").delete().eq("user_id", agentUserId);
  return NextResponse.json({ ok: true });
}