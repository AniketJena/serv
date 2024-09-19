import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const migrationClient = postgres(process.env.DB_URL as string, { max: 1 })
migrate(drizzle(migrationClient), {
  migrationsFolder: "drizzle",
})

const queryClient = postgres(process.env.DB_URL as string)
const db = drizzle(queryClient)
export default db
