import config from "config"
import dayjs from "dayjs"
import { SessionEntity, SessionService } from "modules/tg-session"
import * as path from "path"
import * as fs from "fs"
import { input, sleep } from "shared/utils"
import { TelegramClient } from "telegram"
import { FloodWaitError, RPCError } from "telegram/errors"
import { LogLevel } from "telegram/extensions/Logger"
import { StoreSession } from "telegram/sessions"
import { Logger } from "winston"

interface Props {
  logger: Logger
  sessionService: SessionService
}

const rootDir = process.cwd()
const sessionsDir = path.join(rootDir, "sessions")

if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true })
}

export class TelegramClientProvider {
  public client: TelegramClient
  public activeSession: SessionEntity
  private sessions: SessionEntity[] = []
  private logger
  private sessionService
  private maxRequestCount = 190
  private timeoutWhenNoActiveSources = 1000 * 60 * 60 // 1 hour

  constructor(opts: Props) {
    this.logger = opts.logger
    this.sessionService = opts.sessionService
  }

  public async _initSessionFiles() {
    this.sessions = await this.sessionService.findBy({
      is_active: true,
    })
    if (!this.sessions.length) {
      throw new Error("No active sessions found")
    }

    for (const session of this.sessions) {
      this.activeSession = session
      this.createClient()
      await this.connect()
    }
  }

  public async initialize() {
    this.sessions = await this.sessionService.findBy({ is_active: true })

    if (!this.sessions.length) {
      throw new Error("No active sessions found")
    }

    for (const session of this.sessions) {
      await this.validateSession(session)
    }

    const validSession = this.sessions.find(
      (session) => session.is_active && session.request_count < this.maxRequestCount
    )

    if (!validSession) {
      throw new Error("No one valid session found")
    }

    this.activeSession = validSession
    this.createClient()
    await this.connect()
  }

  public async execute<T>(callback: () => Promise<T>): Promise<T> {
    try {
      await this.checkSession()
      this.logger.debug(
        `Executing request ${this.activeSession.request_count} for session [${this.activeSession.session_name}] ${this.activeSession.first_name}`
      )
      return await callback()
    } catch (err) {
      return this.handleExecuteError(err, callback)
    }
  }

  private async switchClient() {
    const nextSession = await this.getNextSession()
    if (!nextSession) {
      this.logger.error("No valid sessions found")
      return
    }

    await this.disconnect()
    this.activeSession = nextSession
    this.createClient()
    await this.connect()
    this.logger.info(`Switched to client [${nextSession.session_name}] ${nextSession.first_name}`)
  }

  private async getNextSession() {
    try {
      let attempts = 0
      const maxAttempts = this.sessions.length
      // TODO тут баг, всегда выполняется
      //  [2025-01-17 02:45:10] [INFO]: Active session is not valid. Switching client...
      // [2025-01-17 02:45:10] [INFO]: Session [14699817759] Sync #1 is not valid. Trying next...
      // [2025-01-17 02:45:10] [INFO]: Session [14699817759] Sync #1 is not valid. Trying next...
      // [2025-01-17 02:45:10] [INFO]: Session [14699817759] Sync #1 is not valid. Trying next...
      // [2025-01-17 02:45:10] [INFO]: Session [14699817759] Sync #1 is not valid. Trying next...
      // потоуму что один и тот же nextIndex в цикле
      while (attempts < maxAttempts) {
        const currentIndex = this.sessions.findIndex((s) => s.id === this.activeSession.id)
        const nextIndex = (currentIndex + 1) % this.sessions.length
        const nextSession = this.sessions[nextIndex]

        const isValid = await this.validateSession(nextSession)
        if (isValid) {
          return nextSession
        }

        this.logger.info(
          `Session [${nextSession.session_name}] ${nextSession.first_name} is not valid. Trying next...`
        )
        attempts += 1
      }

      this.logger.warn("No valid sessions found. Waiting 1 hour before retrying...")
      await sleep(this.timeoutWhenNoActiveSources)
      await this.switchClient()
    } catch (err) {
      this.logger.error("Failed to get session:", err)
    }
  }

  private async validateSession(session: SessionEntity = this.activeSession): Promise<boolean> {
    const lastRequestTime = dayjs(session.last_request_at)
    const currentTime = dayjs()
    const hoursDifference = currentTime.diff(lastRequestTime, "hour")

    if (hoursDifference > 24) {
      this.logger.info(
        `Resetting request count for session: [${session.session_name}] ${session.first_name}`
      )
      await this.updateSession({
        request_count: 0,
        last_request_at: currentTime.toISOString(),
      })
    }

    return session.is_active && session.request_count < this.maxRequestCount
  }

  private async checkSession() {
    try {
      const isValidActiveSession = await this.validateSession()
      if (!isValidActiveSession) {
        this.logger.debug("Active session is not valid. Switching client...")
        await this.switchClient()
        return
      }

      await this.updateSession({
        request_count: this.activeSession.request_count + 1,
        last_request_at: dayjs().toISOString(),
      })
    } catch (err) {
      this.logger.error("Failed to check session:", err)
    }
  }

  private async updateSession(updates: Partial<SessionEntity> = {}) {
    try {
      Object.assign(this.activeSession, updates)
      await this.sessionService.update({ id: this.activeSession.id, ...updates })
    } catch (err) {
      this.logger.error("Failed to update session:", err)
    }
  }

  private createClient() {
    this.logger.info(
      `Creating telegram client for session [${this.activeSession.session_name}] ${this.activeSession.first_name}`
    )
    this.client = new TelegramClient(
      new StoreSession(`/sessions/${this.activeSession.session_name}`),
      config.telegram.apiId,
      config.telegram.apiHash,
      {
        connectionRetries: 3,
      }
    )
    this.client.setLogLevel(LogLevel.INFO)
  }

  private async connect() {
    if (!this.client || !this.activeSession) return

    try {
      this.logger.info("Connecting to Telegram...")

      const isUserAuthorized = await this.client.isUserAuthorized()
      if (!isUserAuthorized) {
        const sessionPassword = this.sessionService.decryptPassword(
          this.activeSession.password,
          this.activeSession.password_iv
        )

        await this.client.start({
          phoneNumber: this.activeSession.phone,
          password: async () => sessionPassword,
          phoneCode: async () => await input("Please enter the code you received: "),
          forceSMS: false,
          onError: (err) => {
            this.logger.error("Failed to start Telegram:", err)
          },
        })
      }

      await this.client.connect()
      this.logger.info(
        `Client [${this.activeSession.phone}] ${this.activeSession.first_name} successfully connected`
      )
    } catch (err) {
      this.logger.error("Failed to connect to Telegram:", err)
    }
  }

  private async disconnect() {
    try {
      this.logger.info("Disconnecting from Telegram...")
      await this.client.destroy()
      await this.client.disconnect()
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
}
