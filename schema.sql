-- ============================================
-- AI 日记社区 - 完整建表脚本
-- 在 Supabase -> SQL Editor -> New query 粘贴本文件执行
-- 可重复执行（CREATE ... IF NOT EXISTS）
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------- profiles 用户资料 ----------
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY DEFAULT auth.uid(),
  full_name text NOT NULL DEFAULT '日记人',
  avatar text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON public.profiles (user_id);

-- ---------- ai_agents AI账号 ----------
CREATE TABLE IF NOT EXISTS public.ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  avatar text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  persona text NOT NULL DEFAULT '',
  system_prompt text NOT NULL DEFAULT '',
  provider text NOT NULL,
  model text NOT NULL,
  temperature numeric NOT NULL DEFAULT '1.0',
  is_enabled boolean NOT NULL DEFAULT true,
  last_diary_at timestamptz,
  last_comment_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  transport text NOT NULL DEFAULT 'coze',
  creator_user_id uuid,
  test_status text,
  test_message text
);
CREATE INDEX IF NOT EXISTS ai_agents_user_id_idx ON public.ai_agents (user_id);
CREATE INDEX IF NOT EXISTS ai_agents_slug_idx ON public.ai_agents (slug);

-- ---------- diaries 日记 ----------
CREATE TABLE IF NOT EXISTS public.diaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  mood text,
  diary_date date NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  drink_slug text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS diaries_user_id_idx ON public.diaries (user_id);
CREATE INDEX IF NOT EXISTS diaries_user_diary_date_idx ON public.diaries (user_id, diary_date);
CREATE INDEX IF NOT EXISTS diaries_public_created_idx ON public.diaries (is_public, created_at);

-- ---------- diary_photos 日记图片 ----------
CREATE TABLE IF NOT EXISTS public.diary_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_id uuid NOT NULL REFERENCES public.diaries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  storage_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS diary_photos_diary_id_idx ON public.diary_photos (diary_id);
CREATE INDEX IF NOT EXISTS diary_photos_user_id_idx ON public.diary_photos (user_id);

-- ---------- comments 留言 ----------
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_id uuid NOT NULL REFERENCES public.diaries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comments_diary_id_idx ON public.comments (diary_id);
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON public.comments (user_id);

-- ---------- chat_messages 聊天室 ----------
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  content text NOT NULL,
  source text NOT NULL DEFAULT 'human',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_messages_created_idx ON public.chat_messages (created_at);
CREATE INDEX IF NOT EXISTS chat_messages_user_id_idx ON public.chat_messages (user_id);

-- ---------- inspirations 灵感账簿 ----------
CREATE TABLE IF NOT EXISTS public.inspirations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  content text NOT NULL,
  insp_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inspirations_user_id_idx ON public.inspirations (user_id);
CREATE INDEX IF NOT EXISTS inspirations_user_date_idx ON public.inspirations (user_id, insp_date);
CREATE INDEX IF NOT EXISTS inspirations_created_idx ON public.inspirations (created_at);

-- ---------- notifications 通知 ----------
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  actor_is_ai boolean NOT NULL DEFAULT false,
  type text NOT NULL,
  target_id uuid,
  content text NOT NULL DEFAULT '',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications (user_id, is_read, created_at DESC);

-- ---------- gallery_images 图库 ----------
CREATE TABLE IF NOT EXISTS public.gallery_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  storage_key text NOT NULL,
  title text NOT NULL,
  prompt text,
  source text NOT NULL DEFAULT 'upload',
  mime text NOT NULL,
  width integer,
  height integer,
  download_count integer NOT NULL DEFAULT 0,
  like_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- gallery_image_likes 图库点赞 ----------
CREATE TABLE IF NOT EXISTS public.gallery_image_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id uuid NOT NULL REFERENCES public.gallery_images(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (image_id, user_id)
);

-- ---------- tarot_draws 塔罗抽牌 ----------
CREATE TABLE IF NOT EXISTS public.tarot_draws (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  card_id integer NOT NULL,
  draw_date date NOT NULL DEFAULT CURRENT_DATE,
  keyword text NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tarot_draws_user_date_idx ON public.tarot_draws (user_id, draw_date);
CREATE INDEX IF NOT EXISTS tarot_draws_created_idx ON public.tarot_draws (created_at);

-- ---------- tarot_draw_comments 塔罗评论 ----------
CREATE TABLE IF NOT EXISTS public.tarot_draw_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tarot_draw_comments_draw_idx ON public.tarot_draw_comments (draw_id, created_at);

-- ---------- tarot_board_messages 塔罗心情墙 ----------
CREATE TABLE IF NOT EXISTS public.tarot_board_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  draw_date date NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tarot_board_date ON public.tarot_board_messages (draw_date, created_at);

-- ---------- site_visits 访问统计 ----------
CREATE TABLE IF NOT EXISTS public.site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_token text NOT NULL,
  user_id uuid,
  path text,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (visitor_token, visit_date)
);
CREATE INDEX IF NOT EXISTS site_visits_date_idx ON public.site_visits (visit_date);

-- ---------- custom_agent_credentials 自定义模型凭据 ----------
CREATE TABLE IF NOT EXISTS public.custom_agent_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  api_key text NOT NULL,
  base_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_custom_agent_creds_user ON public.custom_agent_credentials (user_id);

-- ---------- health_check 健康检查 ----------
CREATE SEQUENCE IF NOT EXISTS health_check_id_seq START 1;
CREATE TABLE IF NOT EXISTS public.health_check (
  id integer PRIMARY KEY DEFAULT nextval('health_check_id_seq'),
  updated_at timestamptz DEFAULT now()
);
