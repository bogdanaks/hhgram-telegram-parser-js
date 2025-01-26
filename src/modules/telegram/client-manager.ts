import { SessionEntity, SessionService } from "modules/tg-session"
import * as path from "path"
import * as fs from "fs"
import { TelegramClient } from "telegram"
import { Logger } from "winston"
import dayjs from "dayjs"
import { StoreSession } from "telegram/sessions"
import { LogLevel } from "telegram/extensions/Logger"
import config from "config"
import { input } from "shared/utils"
import { FloodWaitError, RPCError } from "telegram/errors"
import { TelegramClientExtended } from "./types"

interface Props {
  logger: Logger
  sessionService: SessionService
}

const rootDir = process.cwd()
const sessionsDir = path.join(rootDir, "sessions")

if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true })
}

export class TelegramClientManager {
  public title: string
  private logger
  private maxRequestCount = 200

  private sessionService

  public client: TelegramClientExtended

  constructor(opts: Props) {
    this.logger = opts.logger
    this.sessionService = opts.sessionService
  }

  public async _unusedAll() {
    const sessions = await this.sessionService.findBy({
      is_active: true,
      is_used: true,
    })

    for (const session of sessions) {
      await this.updateSession(session, { is_used: false })
    }
  }

  public async initialize(title: string) {
    this.title = title
    this.logger.info(`Initializing Telegram ${title} client...`)
    const sessions = await this.sessionService.findBy({
      is_active: true,
      is_used: false,
    })
    const validSession = await this.getValidSessions(sessions)

    if (!validSession.length) {
      throw new Error("No active sessions found")
    }

    this.client = this.createClient(validSession[0])
    await this.connect()
  }

  private async validateSession(session: SessionEntity): Promise<boolean> {
    const lastRequestTime = dayjs(session.last_request_at)
    const currentTime = dayjs()
    const hoursDifference = currentTime.diff(lastRequestTime, "hour")

    if (hoursDifference > 24) {
      this.logger.info(
        `Resetting request count for session: [${session.session_name}] ${session.first_name}`
      )
      await this.updateSession(session, {
        request_count: 0,
        last_request_at: currentTime.toISOString(),
      })
    }

    return session.is_active && session.request_count < this.maxRequestCount
  }

  private async updateSession(session: SessionEntity, updates: Partial<SessionEntity> = {}) {
    try {
      Object.assign(session, updates)
      await this.sessionService.update({ id: session.id, ...updates })
    } catch (err) {
      this.logger.error("Failed to update session:", err)
    }
  }

  private createClient(session: SessionEntity) {
    this.logger.info(
      `Creating telegram client for session [${session.session_name}] ${session.first_name}`
    )
    this.client = new TelegramClient(
      new StoreSession(`/sessions/${session.session_name}`),
      config.telegram.apiId,
      config.telegram.apiHash,
      {
        connectionRetries: 3,
        requestRetries: 3,
        deviceModel: "Telegram Parser",
        appVersion: "1.0.0",
        systemVersion: "1.0.0",
        langCode: "en",
      }
    ) as TelegramClientExtended
    this.client.setLogLevel(LogLevel.INFO)
    this.client.sessionEntity = session
    return this.client
  }

  private async connect() {
    try {
      this.logger.info("Connecting to Telegram...")

      const isUserAuthorized = await this.client.isUserAuthorized()
      if (!isUserAuthorized) {
        const sessionPassword = this.sessionService.decryptPassword(
          this.client.sessionEntity.password,
          this.client.sessionEntity.password_iv
        )

        await this.client.start({
          phoneNumber: this.client.sessionEntity.phone,
          password: async () => sessionPassword,
          phoneCode: async () => await input("Please enter the code you received: "),
          forceSMS: false,
          onError: (err) => {
            this.logger.error("Failed to start Telegram:", err)
          },
        })
      }

      await this.client.connect()
      await this.updateSession(this.client.sessionEntity, { is_used: true })
      this.logger.info(
        `Client [${this.client.sessionEntity.phone}] ${this.client.sessionEntity.first_name} successfully connected`
      )
    } catch (err) {
      this.logger.error("Failed to connect to Telegram:", err)
      throw err
    }
  }

  public async disconnect() {
    try {
      this.logger.info("Disconnecting from Telegram...")
      await this.client.disconnect()
      await this.client.destroy()
      await this.updateSession(this.client.sessionEntity, { is_used: false })
      this.logger.info("Client successfully disconnected")
    } catch (err) {
      this.logger.error("Failed to disconnect from Telegram:", err)
      throw err
    }
  }

  private async handleExecuteError<T>(error: unknown, callback: () => Promise<T>) {
    const err = error as RPCError

    if (err instanceof FloodWaitError) {
      this.logger.warn("FloodWaitError: Switching client...")
      await this.switchClient()
      return this.execute(callback)
    }

    this.logger.error("Error executing request:", err)
    throw err
  }

  private async switchClient() {
    const sessions = await this.sessionService.findBy({
      is_active: true,
      is_used: false,
    })
    const validSessions = await this.getValidSessions(sessions)
    if (!validSessions.length) {
      throw new Error("No one valid sessions found")
    }

    await this.disconnect()
    const nextSession = validSessions[0]
    this.createClient(nextSession)
    await this.connect()
    this.logger.info(`Switched to client [${nextSession.session_name}] ${nextSession.first_name}`)
  }

  private async checkSession() {
    try {
      const isValidActiveSession = await this.validateSession(this.client.sessionEntity)
      if (!isValidActiveSession) {
        this.logger.debug("Active session is not valid. Switching client...")
        await this.switchClient()
        return
      }

      await this.updateSession(this.client.sessionEntity, {
        request_count: this.client.sessionEntity.request_count + 1,
        last_request_at: dayjs().toISOString(),
      })
    } catch (err) {
      this.logger.error("Failed to check session:", err)
      throw err
    }
  }

  private async getValidSessions(sessions: SessionEntity[]) {
    const validSessions = []
    for (const session of sessions) {
      const isValid = await this.validateSession(session)
      if (isValid) {
        validSessions.push(session)
      }
    }

    return validSessions
  }

  public async execute<T>(callback: () => Promise<T>): Promise<T> {
    try {
      await this.checkSession()
      this.logger.debug(
        `Executing request ${this.client.sessionEntity.request_count} for session [${this.client.sessionEntity.session_name}] ${this.client.sessionEntity.first_name}`
      )
      return await callback()
    } catch (err) {
      return this.handleExecuteError(err, callback)
    }
  }

  public async _initSessionFiles() {
    this.logger.info("Initializing session files...")
    const sessions = await this.sessionService.findBy({ is_active: true })
    const validSessions = await this.getValidSessions(sessions)

    if (!validSessions.length) {
      throw new Error("No active sessions found")
    }

    for (const session of validSessions) {
      this.createClient(session)
      await this.connect()
      await this.disconnect()
    }
  }
}
