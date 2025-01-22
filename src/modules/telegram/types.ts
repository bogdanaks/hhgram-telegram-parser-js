import { SessionEntity } from "modules/tg-session"
import { TelegramClient } from "telegram"

export class TelegramClientExtended extends TelegramClient {
  declare sessionEntity: SessionEntity
  declare execute: <T>(callback: () => Promise<T>) => Promise<T>
}
