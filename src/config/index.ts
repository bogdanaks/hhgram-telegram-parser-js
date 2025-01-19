import dotenv from "dotenv"
dotenv.config()

import { checkEnv } from "shared/utils"

checkEnv("TG_APP_ID")
checkEnv("TG_APP_HASH")
checkEnv("TG_IS_LOGGING")

checkEnv("DB_USER")
checkEnv("DB_PASSWORD")
checkEnv("DB_NAME")
checkEnv("DB_HOST")
checkEnv("DB_PORT")

checkEnv("REDIS_HOST")
checkEnv("REDIS_PORT")
checkEnv("REDIS_CHANNEL")

checkEnv("ENCRYPTION_KEY")

export default {
  telegram: {
    apiId: parseInt(process.env.TG_APP_ID || "0"),
    apiHash: process.env.TG_APP_HASH || "",
    isLogging: process.env.TG_IS_LOGGING === "true" || false,
  },
  database: {
    port: Number(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || "",
    user: process.env.DB_USER || "",
    password: process.env.DB_PASSWORD || "",
    host: process.env.DB_HOST || "",
  },
  redis: {
    host: process.env.REDIS_HOST || "",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    loggerChannel: process.env.REDIS_CHANNEL || "",
  },
  app: {
    env: process.env.NODE_ENV || "development",
    encryptionKey: process.env.ENCRYPTION_KEY || "",
  },
}
