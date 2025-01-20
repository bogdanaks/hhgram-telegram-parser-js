import { Api } from "telegram"
import DefaultMessageHandler from "./default"
import { MessagePreType } from "../types"

// 1161968805 | UX UI design - вакансии и резюме
export default class MessageHandler extends DefaultMessageHandler {
  getPreType(message: Api.Message): MessagePreType | null {
    const vacancyHashTags = ["#вакансия", "#vacancy"]
    const resumeHashTags = ["#резюме", "#resume"]

    if (vacancyHashTags.some((tag) => message.message?.toLowerCase()?.includes(tag))) {
      return "vacancy"
    }

    if (resumeHashTags.some((tag) => message.message?.toLowerCase()?.includes(tag))) {
      return "resume"
    }

    return null
  }
}
