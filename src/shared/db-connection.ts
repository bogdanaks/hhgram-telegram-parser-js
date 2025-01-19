import config from "config"
import { DataSource } from "typeorm"

export const AppDataSource = new DataSource({
  type: "postgres",
  host: config.database.host,
  port: config.database.port,
  username: config.database.user,
  password: config.database.password,
  database: config.database.name,
  entities: ["src/modules/*/entity.ts", "src/modules/*/*.entity.ts"],
  logging: process.env.NODE_ENV === "development",
  synchronize: false,
  migrations: ["src/migrations/*.ts"],
})
