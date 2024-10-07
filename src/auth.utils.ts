import { z } from "zod"
import db from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"

export const loginBodyParser = z.object({
  email: z.string().trim().email("Invalid email"),
  password: z.string().min(4, "Too short")
}).superRefine(async (args, ctx) => {
  const [user] = await db.select().from(users).where(eq(users.email, args.email))
  if (user === undefined) {
    ctx.addIssue({
      code: "custom",
      path: ["email"],
      message: "Email not found"
    })
    return
  }
  if (!await Bun.password.verify(args.password, user.password)) {
    ctx.addIssue({
      code: "custom",
      path: ["password"],
      message: "Wrong password"
    })
    return
  }
})

export const signupBodyParser = z.object({
  name: z.string().min(3, "Too short").max(20, "Too long"),
  email: z.string().trim().email("Invalid email"),
  password: z.string().min(4, "Too short")
}).superRefine(async (args, ctx) => {
  let [user] = await db.select().from(users).where(eq(users.email, args.email))
  if (user !== undefined) {
    ctx.addIssue({
      code: "custom",
      path: ["email"],
      message: "Email already exists"
    })
    return
  }
})
