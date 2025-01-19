import { Api } from "telegram"
import { TgUserService } from "./service"
import { SourceEntity } from "modules/source"
import { Logger } from "winston"
import { MessageHandlerFactory } from "modules/message/factory"
import { TgUserEntity } from "./entity"
import { TelegramService } from "modules/telegram"

interface TgUserControllerProps {
  logger: Logger
  tgUserService: TgUserService
  telegramService: TelegramService
  messageHandlerFactory: MessageHandlerFactory
}

export class TgUserController {
  protected logger: Logger
  private tgUserService
  private telegramService
  private messageHandlerFactory: MessageHandlerFactory

  constructor({
    logger,
    tgUserService,
    telegramService,
    messageHandlerFactory,
  }: TgUserControllerProps) {
    this.logger = logger
    this.tgUserService = tgUserService
    this.telegramService = telegramService
    this.messageHandlerFactory = messageHandlerFactory
  }

  async processUser(message: Api.Message, source: SourceEntity) {
    let user: TgUserEntity | null = null

    if (message.fromId instanceof Api.PeerUser) {
      const findInMisc = await this.tgUserService.findTgUserMisc(message.fromId.userId.toString())
      if (findInMisc) {
        this.logger.warn(`[${source.id}] User (${message.fromId.userId.toString()}) found in misc`)
      } else {
        user = await this.findOrFetchUser(message.fromId.userId.toString(), source)
        if (!user) {
          await this.tgUserService.saveTgUserMiscExtraction(message.fromId.userId.toString())
        }
      }
    }

    if (!user) {
      const handler = this.messageHandlerFactory.getHandler(source.id)
      const clearedMessage = handler.clearMessage(message)
      const username = handler.getUsername(clearedMessage)

      if (username) {
        const usernameLower = username.toLowerCase()

        const findInMisc = await this.tgUserService.findTgUserMisc(usernameLower)
        if (findInMisc) {
          this.logger.warn(`[${source.id}] User (${usernameLower}) found in misc`)
        } else {
          user = await this.findOrFetchUser(usernameLower, source, true)
          if (!user) {
            await this.tgUserService.saveTgUserMiscExtraction(usernameLower)
          }
        }
      }
    }

    return user
  }

  private async findOrFetchUser(
    identifier: string,
    source: SourceEntity,
    byUsername = false
  ): Promise<TgUserEntity | null> {
    const user = await this.tgUserService.getTgUserBy(
      byUsername ? { username: identifier.toLowerCase() } : { id: identifier }
    )

    if (!user) {
      this.logger.debug(`[${source.id}] User (${identifier}) not found in DB, fetching from API`)
      const apiUser = await this.telegramService.getEntity(identifier)
      if (apiUser && apiUser instanceof Api.User) {
        const savedUser = await this.tgUserService.saveTgUser({
          id: apiUser.id.toString(),
          username: apiUser.username?.toLowerCase(),
          premium: apiUser.premium,
          first_name: apiUser.firstName,
          last_name: apiUser.lastName,
          phone: apiUser.phone,
          photo_id:
            apiUser.photo instanceof Api.UserProfilePhoto ? apiUser.photo.photoId.toString() : null,
        })
        this.logger.debug(`[${source.id}] User (${identifier}) saved`)
        return savedUser
      }
    }

    return user
  }
}
