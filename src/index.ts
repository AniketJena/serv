import { Elysia } from "elysia";
import auth from "./auth";

const app = new Elysia().use(auth).listen(3000)

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
