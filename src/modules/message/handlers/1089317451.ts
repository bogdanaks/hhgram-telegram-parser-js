import { Api } from "telegram"
import DefaultMessageHandler from "./default"
import { MessagePreType } from "../types"

// 1089317451 | QA — вакансии
export default class MessageHandler extends DefaultMessageHandler {
  getPreType(message: Api.Message): MessagePreType | null {
    return "vacancy"
  }
}
