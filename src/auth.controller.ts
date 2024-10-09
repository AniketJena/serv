import Elysia from "elysia";
import db from "@/db";
import { users } from "@/db/schema";
import { loginBodyParser, signupBodyParser } from "./auth.utils";
import { jwt } from "@elysiajs/jwt";
import { eq } from "drizzle-orm";

const authRouteHandler = new Elysia({
  prefix: "/auth"
}).use(jwt({
  name: "jwt",
  secret: process.env.JWT_SECRET as string
}))
  .get("/", async () => {
    return {
      msg: "this is the auth route"
    }
  })
  .post("/login", async ({ jwt, body, cookie: { auth }, error: err }) => {
    const { success, error, data } = await loginBodyParser.safeParseAsync(body)
    if (!success) {
      return err("Not Acceptable", error?.formErrors.fieldErrors)
    }
    const [user] = await db.select().from(users).where(eq(users.email, data.email))
    auth.set({
      value: await jwt.sign({ user_id: user.id }),
      httpOnly: true,
      maxAge: 60 * 60 * 2,
      path: "/",
      sameSite: "lax"
    })

    return {
      msg: "Logged in!"
    }
  })
  .post("/signup", async ({ jwt, body, cookie: { auth }, error: err }) => {
    const { success, error, data } = await signupBodyParser.safeParseAsync(body)
    if (!success) {
      return err("Not Acceptable", error?.formErrors.fieldErrors)
    }

    const hashedPassword = await Bun.password.hash(data!.password)
    const [user] = await db.insert(users).values({
      name: data!.name,
      email: data!.email,
      password: hashedPassword
    }).returning()
    auth.set({
      value: await jwt.sign({ user_id: user.id }),
      httpOnly: true,
      maxAge: 60 * 60 * 2,
      path: "/",
      sameSite: "lax"
    })

    return {
      msg: "Signed up and logged in!"
    }
  })
  .get("/me", async ({ jwt, cookie: { auth }, error: err }) => {
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

    const [user] = await db.selectDistinct().from(users).where(eq(users.id, data.user_id as string))

    return {
      userName: user.name,
      userEmail: user.email
    }

  })
  .delete("/logout", async ({ cookie, cookie: { auth }, error: err }) => {
    const c = auth.cookie.value
    if (!c) {
      return err("Non-Authoritative Information", {
        msg: "some error occured"
      })
    }
    auth.remove()
    delete cookie.auth
    return {
      msg: "Logged out!"
    }
  })

export default authRouteHandler
