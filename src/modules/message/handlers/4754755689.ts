import { Api } from "telegram"
import DefaultMessageHandler from "./default"

// 4754755689 | Test HHGRAM #2
export default class MessageHandler extends DefaultMessageHandler {
  isValid(message: Api.Message) {
    return super.isValid(message)
  }

  clearMessage(message: Api.Message) {
    // return super.clearMessage(message)
    return message.message
      .replace(/⬇️ Другие каналы IT-вакансий:\s*@best_itjob\s*@it_rab/g, "")
      .trim()
  }

  getUsername(text: string) {
    return super.getUsername(text)
  }

  getUsernameOrId(message: Api.Message) {
    return super.getUsernameOrId(message)
  }
}
