import { Api } from "telegram"

export interface CreateMessage {
  message_id: string
  source_id: string
  from_id: string | null
  duplicate_id: string | null
  text: string | null
  message_at: string
  pre_type: MessagePreType | null
}

export interface BaseMessageHandler {
  isValid(message: Api.Message): boolean
  clearMessage(message: Api.Message): string
  getUsername(text: string): string | undefined
  getUsernameOrId(message: Api.Message): string | bigInt.BigInteger | undefined
  getPreType(message: Api.Message): MessagePreType | null
}

export type MessagePreType = "resume" | "vacancy"
