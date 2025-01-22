import config from "config"
import { Logger } from "winston"
import Redis from "ioredis"
import dayjs from "dayjs"

export class RedisService {
  private logger: Logger

  public publisherRedis: Redis
  public subscriberRedis: Redis

  constructor({ logger }: { logger: Logger }) {
    this.logger = logger
    this.publisherRedis = new Redis({ host: config.redis.host, port: config.redis.port })
    this.subscriberRedis = new Redis({ host: config.redis.host, port: config.redis.port })
  }

  async connect() {
    try {
      if (!config.telegram.isLogging) {
        this.logger.info("Logging is disabled, not connecting to Redis")
        return
      }

      this.logger.info("Connecting to Redis...")
      this.publisherRedis.on("connect", () => {
        this.logger.info("Publisher Redis connected")
      })
      this.subscriberRedis.on("connect", () => {
        this.logger.info("Subscriber Redis connected")
      })

      this.publisherRedis.on("error", (err) => {
        this.logger.error("Publisher Redis error:", err)
      })
      this.subscriberRedis.on("error", (err) => {
        this.logger.error("Subscriber Redis error:", err)
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
      await this.publisherRedis.publish(config.redis.loggerChannel, JSON.stringify(messageData))
      this.logger.debug(
        `Published message to redis channel ${config.redis.loggerChannel}: ${message}`
      )
    } catch (err) {
      this.logger.error("Failed to send redis message:", err)
    }
  }

  async subscribeOn(channel: string, callback: (receivedChannel: string, message: string) => void) {
    try {
      this.subscriberRedis.subscribe(channel, (err) => {
        if (err) {
          this.logger.error("Failed to subscribe to redis channel:", err)
          return
        }
        this.logger.info(`Subscribed to redis channel ${channel}`)
      })

      this.subscriberRedis.on("message", (receivedChannel, message) => {
        if (receivedChannel === channel) {
          callback(receivedChannel, message)
        }
      })
    } catch (err) {
      this.logger.error("Failed to subscribe to redis channel:", err)
    }
  }
}
