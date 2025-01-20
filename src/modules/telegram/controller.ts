import { Logger } from "winston"
import { TelegramService } from "./service"
import { SourceService } from "modules/source"
import dayjs from "dayjs"
import { MessageController, MessageService } from "modules/message"
import { RPCError } from "telegram/errors"
import { TelegramClientProvider } from "./client-provider"
import { NewMessage } from "telegram/events"
import { Api } from "telegram"
import { BigInteger } from "big-integer"

interface Props {
  logger: Logger
  telegramClientProvider: TelegramClientProvider
  telegramService: TelegramService
  sourceService: SourceService
  messageController: MessageController
  messageService: MessageService
}

export class TelegramController {
  private logger: Logger
  private telegramClientProvider: TelegramClientProvider
  private telegramService: TelegramService
  private sourceService: SourceService
  private messageController: MessageController
  private messageService: MessageService

  constructor(opts: Props) {
    this.logger = opts.logger
    this.telegramClientProvider = opts.telegramClientProvider
    this.telegramService = opts.telegramService
    this.sourceService = opts.sourceService
    this.messageController = opts.messageController
    this.messageService = opts.messageService
  }

  async monitoringMessages() {
    try {
      this.logger.info("Start monitoring messages...")
      const sources = await this.sourceService.findBy({
        where: { is_active: true, is_seeded: true },
      })
      const sourceIds = sources.map((source) => source.id).join(", ")
      this.logger.info(`Found sources for monitoring: ${sourceIds}`)

      this.telegramClientProvider.client.addEventHandler(async (event) => {
        const message = event.message
        if (event.isPrivate) {
          this.logger.warn("Message if private:", event)
          return
        }

        let chatId: BigInteger | null = null

        if (message.peerId instanceof Api.PeerChannel) {
          chatId = message.peerId.channelId
        } else if (message.peerId instanceof Api.PeerChat) {
          chatId = message.peerId.chatId
        } else {
          this.logger.warn("Message is not channel or chat:", event)
          return
        }

        const targetSource = sources.find((s) => s.id.toString() === chatId.toString())
        if (!targetSource) {
          this.logger.error("Failed to get target source:", event)
          return
        }

        await this.messageController.handleNewMessage(message, targetSource)
      }, new NewMessage({}))
    } catch (err) {
      this.logger.error("Failed to monitoring messages:", err)
    }
  }

  async seedData() {
    try {
      this.logger.info("Start seeding data...")

      const sources = await this.sourceService.findBy({
        where: { is_active: true, is_seeded: false },
      })

      if (!sources.length) {
        this.logger.info("No sources for seeding")
        return
      }

      for (const targetSource of sources) {
        const isValidSource = await this.telegramService.validateSource(targetSource.id)
        if (!isValidSource) {
          await this.telegramService.joinToSource(targetSource.username)
        }

        const lastMessage = await this.messageService.getLastMessage(targetSource.id)
        let fromDate = dayjs().subtract(6, "month").unix()

        if (lastMessage) {
          this.logger.debug("Found last message")
          fromDate = dayjs(lastMessage.message_at).add(1, "milliseconds").unix()
        }

        const messagesIterator = await this.telegramService.getMessagesByOffsetDate(
          Number(targetSource.id),
          fromDate
        )
        if (!messagesIterator) return
        let counter = 1

        for await (const message of messagesIterator) {
          if (!message.date || message.date < fromDate) {
            break
          }

          if (!message.message?.length) {
            continue
          }

          this.logger.debug(
            `[${targetSource.id}] [${message.id}] Message ${counter} seeding (${dayjs
              .unix(message.date)
              .format("YYYY-MM-DD HH:mm")})`
          )

          await this.messageController.handleNewMessage(message, targetSource)
          counter++
        }
      }
      this.logger.info("Seeding data completed")
    } catch (err) {
      const error = err as RPCError
      this.logger.error("Failed to seed data:", error)
    }
  }

  async seedUsers() {
    try {
      this.logger.info("Start seeding users...")
      const sources = await this.sourceService.findBy({
        where: { is_active: true, id: "1102268569" },
      })

      for (const targetSource of sources) {
        const participiants = await this.telegramService.getParticipants(targetSource.username)
        console.log("participiants", participiants)
        //   const entity = await this.telegramService.getEntity(targetSource)
        //   if (!entity) continue

        //   const isJoined = await this.telegramService.joinToSource(entity)
        //   if (!isJoined) continue

        //   await this.sourceService.update({ id: targetSource.id, is_joined: true })
      }
    } catch (err) {
      const error = err as RPCError
      this.logger.error("Failed to seed users:", error)
    }
  }

  async getDialogs() {
    try {
      const dialogs = await this.telegramService.getDialogs()
      for await (const dialog of dialogs) {
        if (!dialog.entity) continue
        this.logger.info(
          `Dialog: ${dialog.entity?.id?.toString()} ${dialog.title} - ${
            // @ts-ignore
            dialog.entity?.photo?.photoId
          }`
        )
      }
    } catch (err) {
      this.logger.error("Failed to get dialogs:", err)
    }
  }
}
