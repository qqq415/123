import { pgTable, serial, timestamp, uuid, text, boolean, date, index } from "drizzle-orm/pg-core"
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