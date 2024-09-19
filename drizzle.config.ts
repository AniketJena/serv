import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
config()

export default defineConfig({
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DB_URL as string,
  },
  verbose: true,
  strict: true
})
