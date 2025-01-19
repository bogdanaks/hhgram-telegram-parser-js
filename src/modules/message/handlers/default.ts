import { Api } from "telegram"
import { BaseMessageHandler, MessagePreType } from "../types"
import { whiteMessageWords } from "config/white-words"

export default abstract class DefaultMessageHandler implements BaseMessageHandler {
  isValid(message: Api.Message) {
    return this.validateByWhiteList(message)
  }

  clearMessage(message: Api.Message) {
    return message.message
  }

  getUsername(text: string) {
    const pattern = /(?:^|\s|[:])(?:@|tg\s+|https?:\/\/t\.me\/)[\u200C]*([a-zA-Z0-9_]+)/
    const matches = text.match(pattern)
    if (matches && matches.length > 0) {
      return matches[1].toString()
    }
  }

  getUsernameOrId(message: Api.Message) {
    if (message.fromId instanceof Api.PeerUser) {
      return message.fromId.userId
    } else {
      return this.getUsername(message.message)
    }
  }

  getPreType(message: Api.Message): MessagePreType | null {
    return null
  }

  private validateByWhiteList(message: Api.Message) {
    const messageLower = message.message.toLowerCase()
    return whiteMessageWords.some((word) => messageLower.includes(word))
  }
}
