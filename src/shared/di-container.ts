import { createContainer, asClass, asValue } from "awilix"
import { AppDataSource } from "shared/db-connection"
import { RedisService } from "shared/redis"
import { MessageController, MessageService } from "modules/message"
import logger from "shared/logger"
import { Logger } from "winston"
import { DataSource } from "typeorm"
import { SourceService } from "modules/source/service"
import { MessageHandlerFactory } from "modules/message/factory"
import { TgUserController, TgUserService } from "modules/tg-user"
import { TelegramController, TelegramService, TelegramClientProvider } from "modules/telegram"
import { SessionService } from "modules/tg-session"

interface AppDependencies {
  logger: Logger
  db: DataSource
  redisService: RedisService
  sessionService: SessionService
  messageController: MessageController
  messageService: MessageService
  messageHandlerFactory: MessageHandlerFactory
  sourceService: SourceService
  tgUserController: TgUserController
  tgUserService: TgUserService
  telegramController: TelegramController
  telegramService: TelegramService
  telegramClientProvider: TelegramClientProvider
}

export const diContainer = createContainer<AppDependencies>()

diContainer.register({
  logger: asValue(logger),
  db: asValue(AppDataSource),
  redisService: asClass(RedisService).singleton(),
  sessionService: asClass(SessionService).singleton(),
  messageController: asClass(MessageController).singleton(),
  messageService: asClass(MessageService).singleton(),
  messageHandlerFactory: asClass(MessageHandlerFactory).singleton(),
  sourceService: asClass(SourceService).singleton(),
  tgUserController: asClass(TgUserController).singleton(),
  tgUserService: asClass(TgUserService).singleton(),
  telegramController: asClass(TelegramController).singleton(),
  telegramService: asClass(TelegramService).singleton(),
  telegramClientProvider: asClass(TelegramClientProvider).singleton(),
})
