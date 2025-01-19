import { EntityLike } from "telegram/define"
import { Logger } from "winston"
import { TelegramClientProvider } from "./client-provider"
import { Api } from "telegram"
import Big from "big-integer"
import { random, sleep } from "shared/utils"
import { RPCError } from "telegram/errors"

interface Props {
  logger: Logger
  telegramClientProvider: TelegramClientProvider
}

export class TelegramService {
  private logger
  public telegramClientProvider

  constructor(opts: Props) {
    this.logger = opts.logger
    this.telegramClientProvider = opts.telegramClientProvider
  }

  public async getEntity(entity: EntityLike) {
    try {
      return await this.telegramClientProvider.execute(async () => {
        await sleep(random(2000, 6000))
        return await this.telegramClientProvider.client.getEntity(entity)
      })
    } catch (err) {
      const error = err as RPCError
      this.logger.error("Failed to get entity:", error)
    }
  }

  public async getMessagesByOffsetDate(sourceId: number, offsetDate?: number) {
    try {
      this.logger.debug(`Fetching messages from Telegram API by ${sourceId}`)
      const sourceEntity = await this.getEntity(new Api.PeerChannel({ channelId: Big(sourceId) }))
      return this.telegramClientProvider.client.iterMessages(sourceEntity, {
        offsetDate: offsetDate,
        reverse: true,
        waitTime: 2,
      })
    } catch (err) {
      this.logger.error("Failed to fetch messages:", err)
      throw err
    }
  }

  public async joinToSource(sourceUsername: string) {
    try {
      this.logger.info(`Joining to source: ${sourceUsername}`)
      await this.telegramClientProvider.execute(async () => {
        await this.telegramClientProvider.client.invoke(
          new Api.channels.JoinChannel({
            channel: sourceUsername,
          })
        )
      })
    } catch (err) {
      this.logger.error("Failed to join to source:", err)
      throw err
    }
  }

  public async validateSource(sourceId: string) {
    try {
      this.logger.debug(`Validating source: ${sourceId}`)
      const sourceEntity = await this.getEntity(new Api.PeerChannel({ channelId: Big(sourceId) }))
      if (!sourceEntity) {
        this.logger.debug(`Source ${sourceId} not found`)
        return false
      }

      this.logger.debug(`Source ${sourceEntity?.id.toString()} is valid`)
      return true
    } catch (err) {
      this.logger.error("Failed to validate sources:", err)
      return false
    }
  }

  public async canProcessingSource(sourceId: string) {
    try {
      this.logger.debug(
        `Checking if source ${sourceId} can be processed as [${this.telegramClientProvider.activeSession.session_name}] ${this.telegramClientProvider.activeSession.first_name}`
      )

      if (!this.telegramClientProvider.activeSession.session_sources.length) {
        return true
      }

      if (
        this.telegramClientProvider.activeSession.session_sources.length &&
        this.telegramClientProvider.activeSession.session_sources.some(
          (i) => i.source_id === sourceId
        )
      ) {
        return true
      }
      return false
    } catch (err) {
      this.logger.error("Failed to validate sources:", err)
      throw err
    }
  }

  // надо как-то этот метод допилить, чтобы предварительно из группы собирать участников за последние пол года и сохранять их
  public async getParticipants(sourceUsername: string) {
    try {
      this.logger.info(`Fetching participiants from Telegram API`)
      const fullSource = await this.telegramClientProvider.client.invoke(
        new Api.channels.GetFullChannel({
          channel: sourceUsername,
        })
      )
      const participantsCount = (fullSource.fullChat as Api.ChannelFull).participantsCount
      if (!participantsCount) {
        throw new Error("Participants count not found")
      }

      console.log("participantsCount", participantsCount)

      return await this.telegramClientProvider.execute(async () => {
        return this.telegramClientProvider.client.iterParticipants(sourceUsername, {
          // offsetDate: offsetDate,
          // reverse: true,
          // waitTime: 2,
        })
        // return await this.telegramClientProvider.client.invoke(
        //   new Api.channels.GetParticipants({
        //     channel: sourceUsername,
        //     filter: new Api.ChannelParticipantsRecent(),
        //     offset: 0,
        //     limit: 1,
        //     // min_date: dayjs().unix(),
        //     // hash: BigInt("-4156887774564"),
        //   })
        // )
      })
    } catch (err) {
      this.logger.error("Failed to fetch participiants:", err)
      throw err
    }
  }

  public async checkLastOnlineUser(sourceId: string) {
    // try {
    //   this.logger.info(`Checking last online user from Telegram API`)
    //   const sourceEntity = await this.getEntity(new Api.PeerChannel({ channelId: Big(sourceId) }))
    //   if (!sourceEntity) {
    //     throw new Error("Source not found")
    //   }
    //   return await this.telegramClientProvider.execute(async () => {
    //     return await this.telegramClientProvider.client.getParticipants(sourceEntity, {
    //       filter: new Api.ChannelParticipantsRecent(),
    //       limit: 1,
    //       offset: 0,
    //       showTotal: true,
    //     })
    //   })
    // } catch (err) {
    //   this.logger.error("Failed to fetch participiants:", err)
    //   throw err
    // }
  }
}
