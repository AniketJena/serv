import Elysia from "elysia";
import db from "@/db";
import { z } from "zod";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const auth = new Elysia({
  prefix: "/auth"
})

auth.get("/", async () => {
  return {
    msg: "this is the auth route"
  }
})
  .post("/login", async ({ body }) => {
    const bodyParser = z.object({
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

    const { error } = await bodyParser.safeParseAsync(body)
    console.table(error?.formErrors.fieldErrors)
  })

export default auth
