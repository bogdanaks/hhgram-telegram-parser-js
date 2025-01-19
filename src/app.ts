import { AppDataSource } from "shared/db-connection"
import { diContainer } from "shared/di-container"

async function startApp() {
  const logger = diContainer.resolve("logger")
  try {
    const telegramClientProvider = diContainer.resolve("telegramClientProvider")
    const telegramController = diContainer.resolve("telegramController")
    const redisService = diContainer.resolve("redisService")

    await AppDataSource.initialize()
    logger.info("Database connected")

    await redisService.connect()
    await telegramClientProvider.initialize()

    logger.info("App started")
    await telegramController.monitoringMessages()
  } catch (err) {
    logger.error("Failed to start app:", err)
    process.exit(1)
  }
}

startApp()
