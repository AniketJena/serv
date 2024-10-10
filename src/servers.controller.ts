import jwt from "@elysiajs/jwt";
import Elysia from "elysia";
import db from "./db";
import { channels, membersToServers, messages, servers, users } from "./db/schema";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { which } from "bun";

const serversRouteHandler = new Elysia({
  prefix: "/servers"
}).use(jwt({
  name: "jwt",
  secret: process.env.JWT_SECRET as string
}))
  .get("/joined-servers", async ({ jwt, cookie: { auth }, error: err }) => {
    const c = auth.cookie.value
    if (!c) {
      return err("Non-Authoritative Information", {
        msg: "You need to login first!"
      })
    }
    const data = await jwt.verify(c as string)
    if (!data) {
      return err("Non-Authoritative Information", {
        msg: "Invalid or expired token"
      })
    }
    return await db.transaction(async (tx) => {
      const result = await tx.select({ memberId: membersToServers.memberId, serverData: servers }).from(membersToServers)
        .where(eq(membersToServers.memberId, data.user_id as string))
        .rightJoin(servers, eq(membersToServers.joinedServerId, servers.id))

      const userServers = result.map((item) => {
        return {
          serverId: item.serverData.id,
          serverName: item.serverData.name,
          isAdmin: item.memberId === item.serverData.adminId
        }
      })
      return userServers
    })
  })
  .get("/:server-id", async ({ params }) => {
    const { "server-id": serverId } = params
    const [server] = await db.select().from(servers).where(eq(servers.id, serverId))
    const serverChannels = await db.select({ id: channels.id, name: channels.name, serverId: channels.serverId }).from(channels).where(eq(channels.serverId, server.id))

    return {
      server,
      serverChannels
    }
  })
  .post("/", async ({ jwt, cookie: { auth }, body, error: err }) => {
    const c = auth.cookie.value
    if (!c) {
      return err("Non-Authoritative Information", {
        msg: "some error occured"
      })
    }
    const data = await jwt.verify(c as string)
    if (!data) {
      return err("Non-Authoritative Information", {
        msg: "invalid or expired token"
      })
    }
    const bodyParser = z.object({
      serverName: z.string().min(4, "Too short"),
      createMainChannel: z.boolean()
    })

    const { success, data: parsedBody, error } = await bodyParser.safeParseAsync(body)
    if (!success) {
      return err("Not Acceptable", error?.formErrors.fieldErrors)
    }
    // db transaction to create server, add the user in the join table, create main channel if needed
    return await db.transaction(async (tx) => {
      const [server] = await tx.insert(servers).values({
        name: parsedBody.serverName,
        adminId: data.user_id as string
      }).returning()

      await tx.insert(membersToServers).values({
        memberId: data.user_id as string,
        joinedServerId: server.id,
      })

      if (parsedBody.createMainChannel) {
        await tx.insert(channels).values({
          name: "main-channel",
          serverId: server.id
        })
        return {
          msg: "Server created with main-channel!"
        }
      } else {
        return {
          msg: "Server created!"
        }
      }
    })
  })
  .post("/:server-id", async ({ params, jwt, cookie: { auth }, body, error: err }) => {
    const { "server-id": serverId } = params
    const c = auth.cookie.value
    if (!c) {
      return err("Non-Authoritative Information", {
        msg: "some error occured"
      })
    }
    const data = await jwt.verify(c as string)
    if (!data) {
      return err("Non-Authoritative Information", {
        msg: "invalid or expired token"
      })
    }
    const bodyParser = z.object({
      channelName: z.string().min(4, "Too short"),
    })

    const { success, data: parsedBody, error } = await bodyParser.safeParseAsync(body)
    if (!success) {
      return err("Not Acceptable", error?.formErrors.fieldErrors)
    }

    await db.insert(channels).values({
      name: parsedBody.channelName,
      serverId
    })

    return {
      msg: `New channel ${parsedBody.channelName} created!`
    }
  })
  .get("/:server-id", async ({ params, jwt, cookie: { auth }, error: err }) => {
    const { "server-id": serverId } = params
    const c = auth.cookie.value
    if (!c) {
      return err("Non-Authoritative Information", {
        msg: "You need to login first!"
      })
    }
    const data = await jwt.verify(c as string)
    if (!data) {
      return err("Non-Authoritative Information", {
        msg: "invalid or expired token"
      })
    }
    const result = await db.select().from(channels).where(eq(channels.serverId, serverId))

    return result
  })
  .get("/channel/:channel-id", async ({ params, jwt, cookie: { auth }, error: err }) => {
    const { "channel-id": channelId } = params
    const c = auth.cookie.value
    if (!c) {
      return err("Non-Authoritative Information", {
        msg: "You need to login first!"
      })
    }
    const data = await jwt.verify(c as string)
    if (!data) {
      return err("Non-Authoritative Information", {
        msg: "invalid or expired token"
      })
    }
    const channelMessages = await db.select({
      id: messages.id,
      content: messages.content,
      createdAt: messages.createdAt,
      authorId: messages.authorId,
      channelId: messages.channelId,
      authorName: users.name
    }).from(messages)
      .where(eq(messages.channelId, channelId)).orderBy(asc(messages.createdAt))
      .rightJoin(users, eq(messages.authorId, users.id))

    return channelMessages
  })
  .get("/:server-id/join", async ({ params, jwt, cookie: { auth }, error: err }) => {
    const { "server-id": serverId } = params
    const c = auth.cookie.value
    if (!c) {
      return err("Non-Authoritative Information", {
        msg: "You need to login first!"
      })
    }
    const data = await jwt.verify(c as string)
    if (!data) {
      return err("Non-Authoritative Information", {
        msg: "invalid or expired token"
      })
    }
    await db.insert(membersToServers).values({
      memberId: data.user_id as string,
      joinedServerId: serverId
    })

    return {
      msg: "Joined!"
    }
  })

export default serversRouteHandler
