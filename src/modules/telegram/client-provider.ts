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

/*
Проверить можно ли сделать коннект сразу несколько аккаунтов

Основные проблемы
1. Нет возможности сидить и мониторить одновременно данные
2. Не работает переключатель  сессии корректно, надо получать новую сессию из бд в момент переключения
3. При перезагрузках или остановках происходят дыры в парсинге, надо сперва проходиться по каналам собирать пропуски, потом запускать подписку
4. Менять подписки в реальном времени

Запускать слушатель на редис канал, который будет принимать source id для сида, если он пришел, запускам сид с доступными клиентами из бд is_used=false
*/

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
  private logger
  private maxRequestCount = 1

  private sessionService

  public monitoringClient: TelegramClientExtended
  public seedingClient: TelegramClientExtended

  constructor(opts: Props) {
    this.logger = opts.logger
    this.sessionService = opts.sessionService
  }

  public async initialize() {
    const sessions = await this.sessionService.findBy({
      is_active: true,
    })
    const validSession = await this.getValidSessions(sessions)

    if (validSession.length < 2) {
      throw new Error("No active sessions found")
    }

    this.monitoringClient = this.createClient(validSession[0])
    this.seedingClient = this.createClient(validSession[1])

    await this.connect(this.monitoringClient)
    await this.connect(this.seedingClient)
  }

  private async validateSession(session: SessionEntity): Promise<boolean> {
    const lastRequestTime = dayjs(session.last_request_at)
    const currentTime = dayjs()
    const hoursDifference = currentTime.diff(lastRequestTime, "hour")

    if (hoursDifference > 1) {
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
    const client = new TelegramClient(
      new StoreSession(`/sessions/${session.session_name}`),
      config.telegram.apiId,
      config.telegram.apiHash,
      {
        connectionRetries: 3,
      }
    ) as TelegramClientExtended
    client.setLogLevel(LogLevel.INFO)
    client.sessionEntity = session
    return client
  }

  private async connect(client: TelegramClientExtended) {
    try {
      this.logger.info("Connecting to Telegram...")

      const isUserAuthorized = await client.isUserAuthorized()
      if (!isUserAuthorized) {
        const sessionPassword = this.sessionService.decryptPassword(
          client.sessionEntity.password,
          client.sessionEntity.password_iv
        )

        await client.start({
          phoneNumber: client.sessionEntity.phone,
          password: async () => sessionPassword,
          phoneCode: async () => await input("Please enter the code you received: "),
          forceSMS: false,
          onError: (err) => {
            this.logger.error("Failed to start Telegram:", err)
          },
        })
      }

      await client.connect()
      await this.updateSession(client.sessionEntity, { is_used: true })
      this.logger.info(
        `Client [${client.sessionEntity.phone}] ${client.sessionEntity.first_name} successfully connected`
      )
    } catch (err) {
      this.logger.error("Failed to connect to Telegram:", err)
    }
  }

  private async disconnect(client: TelegramClientExtended) {
    try {
      this.logger.info("Disconnecting from Telegram...")
      await client.destroy()
      await client.disconnect()
      await this.updateSession(client.sessionEntity, { is_used: false })
      this.logger.info("Client successfully disconnected")
    } catch (err) {
      this.logger.error("Failed to disconnect from Telegram:", err)
      throw err
    }
  }

  private async handleExecuteError<T>(
    client: TelegramClientExtended,
    error: unknown,
    callback: () => Promise<T>
  ) {
    const err = error as RPCError

    if (err instanceof FloodWaitError) {
      this.logger.warn("FloodWaitError: Switching client...")
      await this.switchClient(client)
      return this.execute(client, callback)
    }

    this.logger.error("Error executing request:", err)
    throw err
  }

  private async switchClient(client: TelegramClientExtended) {
    const sessions = await this.sessionService.findBy({
      is_active: true,
      is_used: false,
    })
    const validSessions = await this.getValidSessions(sessions)
    if (!validSessions.length) {
      throw new Error("No one valid sessions found")
    }

    await this.disconnect(client)
    const nextSession = validSessions[0]
    const newClient = this.createClient(nextSession)

    if (this.monitoringClient.sessionEntity.id === client.sessionEntity.id) {
      this.monitoringClient = newClient
    }

    if (this.seedingClient.sessionEntity.id === client.sessionEntity.id) {
      this.seedingClient = newClient
    }

    await this.connect(newClient)
    this.logger.info(`Switched to client [${nextSession.session_name}] ${nextSession.first_name}`)
  }

  private async checkSession(client: TelegramClientExtended) {
    try {
      const isValidActiveSession = await this.validateSession(client.sessionEntity)
      if (!isValidActiveSession) {
        this.logger.debug("Active session is not valid. Switching client...")
        await this.switchClient(client)
        return
      }

      await this.updateSession(client.sessionEntity, {
        request_count: client.sessionEntity.request_count + 1,
        last_request_at: dayjs().toISOString(),
      })
    } catch (err) {
      this.logger.error("Failed to check session:", err)
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

  public async executeMonitoring<T>(callback: () => Promise<T>): Promise<T> {
    try {
      await this.checkSession(this.monitoringClient)
      this.logger.debug(
        `Executing request ${this.monitoringClient.sessionEntity.request_count} for session [${this.monitoringClient.sessionEntity.session_name}] ${this.monitoringClient.sessionEntity.first_name}`
      )
      return await callback()
    } catch (err) {
      return this.handleExecuteError(this.monitoringClient, err, callback)
    }
  }

  public async executeSeeder<T>(callback: () => Promise<T>): Promise<T> {
    try {
      await this.checkSession(this.seedingClient)
      this.logger.debug(
        `Executing request ${this.seedingClient.sessionEntity.request_count} for session [${this.seedingClient.sessionEntity.session_name}] ${this.seedingClient.sessionEntity.first_name}`
      )
      return await callback()
    } catch (err) {
      return this.handleExecuteError(this.seedingClient, err, callback)
    }
  }
}
