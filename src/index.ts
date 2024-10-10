import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import jwt from "@elysiajs/jwt";
import db from "./db";
import { messages, users } from "./db/schema";
import { eq } from "drizzle-orm";
import serversRouteHandler from "./servers.controller";
import authRouteHandler from "./auth.controller";

export const app = new Elysia().use(cors({
  origin: process.env.ORIGIN as string,
  credentials: true
})).use(jwt({
  name: "jwt",
  secret: process.env.JWT_SECRET as string
}))
  .use(authRouteHandler)
  .use(serversRouteHandler)
  .get("/", () => {
    return {
      msg: "hello world"
    }
  }).
  ws("/ws/:server-id/:channel-id", {
    async open(ws) {
      const { auth } = ws.data.cookie
      const data = await ws.data.jwt.verify(auth.value)
      if (!data) {
        return
      }
      const [user] = await db.selectDistinct().from(users).where(eq(users.id, data?.user_id as string))
      ws.subscribe(`channel_${ws.data.params["channel-id"]}`)
      //app.server?.publish(`channel_${ws.data.params["channel-id"]}`, JSON.stringify({ content: `${user.name} joined!` }), true)
    },
    async message(ws, message) {
      const { auth } = ws.data.cookie
      const { "channel-id": channelId } = ws.data.params
      const data = await ws.data.jwt.verify(auth.value)
      if (!data) {
        return
      }
      const [user] = await db.selectDistinct().from(users).where(eq(users.id, data?.user_id as string))
      const [res] = await db.insert(messages).values({
        content: message as string,
        authorId: user.id,
        channelId: channelId
      }).returning()
      let m = {
        ...res, authorName: user.name
      }
      app.server?.publish(`channel_${ws.data.params["channel-id"]}`, JSON.stringify(m), true)
    },
    async close(ws) {
      const { auth } = ws.data.cookie
      const data = await ws.data.jwt.verify(auth.value)
      if (!data) {
        return
      }
      const [user] = await db.selectDistinct().from(users).where(eq(users.id, data?.user_id as string))
      ws.unsubscribe("test_room")
      app.server?.publish("test_room", JSON.stringify({ msg: `${user.name} left` }), true)
    },
  })
  .listen(3000)
console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
