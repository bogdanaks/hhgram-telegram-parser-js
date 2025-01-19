import { Api } from "telegram"
import DefaultMessageHandler from "./default"
import { MessagePreType } from "../types"

// 1336250861 | IT Jobs | Вакансии в IT
export default class MessageHandler extends DefaultMessageHandler {
  clearMessage(message: Api.Message) {
    return message.message
      .replace(/⬇️ Другие каналы IT-вакансий:\s*@best_itjob\s*@it_rab/g, "")
      .trim()
  }

  getPreType(message: Api.Message): MessagePreType | null {
    return "vacancy"
  }
}
