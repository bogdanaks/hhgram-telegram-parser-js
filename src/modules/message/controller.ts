import { SourceEntity } from "modules/source/entity"
import { Api } from "telegram"
import { Logger } from "winston"
import { MessageService } from "./service"
import { MessageHandlerFactory } from "./factory"
import { TgUserController } from "modules/tg-user"
import dayjs from "dayjs"
import { RedisService } from "shared/redis"

interface Props {
  logger: Logger
  redisService: RedisService
  tgUserController: TgUserController
  messageService: MessageService
  messageHandlerFactory: MessageHandlerFactory
}

export class MessageController {
  private logger: Logger
  private redisService: RedisService
  private tgUserController: TgUserController
  private messageService: MessageService
  private messageHandlerFactory: MessageHandlerFactory

  constructor(opts: Props) {
    this.logger = opts.logger
    this.redisService = opts.redisService
    this.tgUserController = opts.tgUserController
    this.messageService = opts.messageService
    this.messageHandlerFactory = opts.messageHandlerFactory
  }

  async handleNewMessage(message: Api.Message, source: SourceEntity) {
    this.logger.debug(`[${source.id}] [${message.id}] New message received`)

    const findMessage = await this.messageService.findOne({
      message_id: message.id.toString(),
      source_id: source.id,
    })
    if (findMessage) {
      this.logger.debug(`[${source.id}] [${message.id}] Message already saved`)
      return
    }

    const handler = this.messageHandlerFactory.getHandler(source.id)
    const isValidMessage = handler.isValid(message)
    if (!isValidMessage) {
      this.logger.debug(`[${source.id}] [${message.id}] Invalid message`)
      return
    }

    const clearedMessage = handler.clearMessage(message)
    const preType = handler.getPreType(message)
    const user = await this.tgUserController.processUser(message, source)
    const duplicateMessage = await this.messageService.findDuplicateOrigin(
      source.id,
      clearedMessage
    )

    await this.messageService.save({
      message_id: message.id.toString(),
      source_id: source.id,
      from_id: user?.id?.toString() || null,
      duplicate_id: duplicateMessage?.id || null,
      text: duplicateMessage ? null : clearedMessage,
      message_at: dayjs.unix(message.date).toString(),
      pre_type: preType,
    })

    const logMsg = `[${source.id}] [${message.id}] Message saved as type ${preType}`
    this.logger.debug(logMsg)
    this.redisService.sendMessage("info", logMsg)
  }
}
