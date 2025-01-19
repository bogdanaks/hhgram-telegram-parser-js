import { Api } from "telegram"
import DefaultMessageHandler from "./default"

// 1134745498 | Devops Jobs — вакансии и резюме
export default class MessageHandler extends DefaultMessageHandler {
  clearMessage(message: Api.Message) {
    return message.message.replace("@devops_jobs", "")
  }
}
