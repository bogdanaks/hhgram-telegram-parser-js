import { Api } from "telegram"
import DefaultMessageHandler from "./default"
import { MessagePreType } from "../types"

// 1101692370 | Вакансии SMM и Digital
export default class MessageHandler extends DefaultMessageHandler {
  getPreType(message: Api.Message): MessagePreType | null {
    return "vacancy"
  }
}
