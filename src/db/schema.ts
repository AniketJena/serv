import { pgTable, text, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id").notNull().primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow()
})

export const usersRelations = relations(users, ({ many }) => ({
  joinedServers: many(servers)
}))

export const servers = pgTable("servers", {
  id: text("id").notNull().primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  adminId: text("admin_id").notNull().references(() => users.id)
})

export const serversRelations = relations(users, ({ many }) => ({
  members: many(users)
}))

export const channels = pgTable("channels", {
  id: text("id").notNull().primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  serverId: text("server_id").notNull().references(() => servers.id)
})

export const messages = pgTable("messages", {
  id: text("id").notNull().primaryKey().$defaultFn(() => createId()),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true, precision: 3 }).defaultNow(),
  authorId: text("author_id").notNull().references(() => users.id),
  channelId: text("channel_id").notNull().references(() => channels.id)
})

export const membersToServers = pgTable("members_to_servers", {
  memberId: text("member_id").notNull().references(() => users.id),
  joinedServerId: text("joined_server_id").notNull().references(() => servers.id)

}, (t) => ({
  pk: primaryKey({ columns: [t.memberId, t.joinedServerId] })
}))

export const membersToServersRelations = relations(membersToServers, ({ one }) => ({
  joinedServer: one(servers, {
    fields: [membersToServers.joinedServerId],
    references: [servers.id]
  }),
  member: one(users, {
    fields: [membersToServers.memberId],
    references: [users.id]
  })
}))





