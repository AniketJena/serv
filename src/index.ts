import { Elysia } from "elysia";
import auth from "./auth";
import { cors } from "@elysiajs/cors";

const app = new Elysia().use(cors({
  origin: process.env.ORIGIN as string,
  credentials: true
}))
app.get("/", () => {
  return {
    msg: "hello world"
  }
})
app.use(auth).listen(3000)

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
