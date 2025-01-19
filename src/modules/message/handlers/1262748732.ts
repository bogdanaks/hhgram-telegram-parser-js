import { Api } from "telegram"
import DefaultMessageHandler from "./default"
import { MessagePreType } from "../types"

// 1262748732 | Топ IT Вакансии {Разработка | DevOps | QA | Management}
export default class MessageHandler extends DefaultMessageHandler {
  getPreType(message: Api.Message): MessagePreType | null {
    return "vacancy"
  }
}
