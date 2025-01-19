import config from "config"
import { Logger } from "winston"
import Redis from "ioredis"
import dayjs from "dayjs"

export class RedisService {
  private logger: Logger
  public redis: Redis

  constructor({ logger }: { logger: Logger }) {
    this.logger = logger
    this.redis = new Redis({ host: config.redis.host, port: config.redis.port })
  }

  async connect() {
    try {
      if (!config.telegram.isLogging) {
        this.logger.info("Logging is disabled, not connecting to Redis")
        return
      }

      this.logger.info("Connecting to Redis...")
      this.redis.on("connect", () => {
        this.logger.info("Redis connected")
      })
      this.redis.on("error", (err) => {
        this.logger.error("Redis error:", err)
      })
    } catch (err) {
      this.logger.error("Failed to connect to Redis:", err)
    }
  }

  async sendMessage(level: string, message: string) {
    try {
      if (!config.telegram.isLogging) {
        return
      }

      const messageData = {
        level,
        time: dayjs().format("YYYY-MM-DD HH:mm:ss"),
        message,
      }
      await this.redis.publish(config.redis.loggerChannel, JSON.stringify(messageData))
      this.logger.info(
        `Published message to redis channel ${config.redis.loggerChannel}: ${message}`
      )
    } catch (err) {
      this.logger.error("Failed to send redis message:", err)
    }
  }
}
