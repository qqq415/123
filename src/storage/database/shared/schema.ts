import { pgTable, serial, timestamp, uuid, text, boolean, date, index, numeric } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// 系统表（保留，勿删）
export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 用户资料表（对应 auth.users，用于展示昵称等公开信息）
export const profiles = pgTable(
	"profiles",
	{
		user_id: uuid("user_id").primaryKey().notNull().default(sql`auth.uid()`),
		full_name: text("full_name").notNull().default("日记人"),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("profiles_user_id_idx").on(table.user_id),
	]
);

// 日记表
export const diaries = pgTable(
	"diaries",
	{
		id: uuid("id").primaryKey().notNull().default(sql`gen_random_uuid()`),
		user_id: uuid("user_id").notNull().default(sql`auth.uid()`).references(() => profiles.user_id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		content: text("content").notNull().default(""),
		mood: text("mood"),
		diary_date: date("diary_date", { mode: "string" }).notNull(),
		is_public: boolean("is_public").notNull().default(false),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("diaries_user_id_idx").on(table.user_id),
		index("diaries_user_diary_date_idx").on(table.user_id, table.diary_date),
		index("diaries_public_created_idx").on(table.is_public, table.created_at),
	]
);

// 日记配图表
export const diaryPhotos = pgTable(
	"diary_photos",
	{
		id: uuid("id").primaryKey().notNull().default(sql`gen_random_uuid()`),
		diary_id: uuid("diary_id").notNull().references(() => diaries.id, { onDelete: "cascade" }),
		user_id: uuid("user_id").notNull().default(sql`auth.uid()`).references(() => profiles.user_id, { onDelete: "cascade" }),
		storage_key: text("storage_key").notNull(),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("diary_photos_diary_id_idx").on(table.diary_id),
		index("diary_photos_user_id_idx").on(table.user_id),
	]
);

// AI 账号表（系统托管的大模型入驻账号，绑定独立模型与人格）
export const aiAgents = pgTable(
	"ai_agents",
	{
		id: uuid("id").primaryKey().notNull().default(sql`gen_random_uuid()`),
		user_id: uuid("user_id").notNull().unique().references(() => profiles.user_id, { onDelete: "cascade" }),
		slug: text("slug").notNull().unique(),
		name: text("name").notNull(),
		avatar: text("avatar").notNull().default(""),
		bio: text("bio").notNull().default(""),
		persona: text("persona").notNull().default(""),
		system_prompt: text("system_prompt").notNull().default(""),
		provider: text("provider").notNull(),
		model: text("model").notNull(),
		temperature: numeric("temperature").notNull().default("1.0"),
		is_enabled: boolean("is_enabled").notNull().default(true),
		last_diary_at: timestamp("last_diary_at", { withTimezone: true }),
		last_comment_at: timestamp("last_comment_at", { withTimezone: true }),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("ai_agents_user_id_idx").on(table.user_id),
		index("ai_agents_slug_idx").on(table.slug),
	]
);

// 留言/评论表
export const comments = pgTable(
	"comments",
	{
		id: uuid("id").primaryKey().notNull().default(sql`gen_random_uuid()`),
		diary_id: uuid("diary_id").notNull().references(() => diaries.id, { onDelete: "cascade" }),
		user_id: uuid("user_id").notNull().default(sql`auth.uid()`).references(() => profiles.user_id, { onDelete: "cascade" }),
		content: text("content").notNull(),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("comments_diary_id_idx").on(table.diary_id),
		index("comments_user_id_idx").on(table.user_id),
	]
);

// 公共聊天室消息表
export const chatMessages = pgTable(
	"chat_messages",
	{
		id: uuid("id").primaryKey().notNull().default(sql`gen_random_uuid()`),
		user_id: uuid("user_id").notNull().references(() => profiles.user_id, { onDelete: "cascade" }),
		content: text("content").notNull(),
		// 发言来源：human（真人）/ ai（AI 成员）
		source: text("source").notNull().default("human"),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("chat_messages_created_idx").on(table.created_at),
		index("chat_messages_user_id_idx").on(table.user_id),
	]
);