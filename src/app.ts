import { AppDataSource } from "shared/db-connection"
import { diContainer } from "shared/di-container"

async function startApp() {
  const logger = diContainer.resolve("logger")
  try {
    const telegramClientMonitoring = diContainer.resolve("telegramClientMonitoring")
    const telegramClientSeeder = diContainer.resolve("telegramClientSeeder")
    const telegramController = diContainer.resolve("telegramController")
    const redisService = diContainer.resolve("redisService")

    await AppDataSource.initialize()
    logger.info("Database connected")

    await redisService.connect()
    await telegramClientMonitoring.initialize("monitoring")
    await telegramClientSeeder.initialize("seeder")

    logger.info("App started")
    telegramController.monitoringMessages()
    redisService.subscribeOn("seed-source", (receivedChannel: string, sourceId: string) => {
      telegramController.seedDataBySourceId(sourceId)
    })
  } catch (err) {
    logger.error("Failed to start app:", err)
    process.exit(1)
  }
}

startApp()
