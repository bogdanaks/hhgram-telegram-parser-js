import { Api } from "telegram"
import DefaultMessageHandler from "./default"
import { MessagePreType } from "../types"

// 1102268569 | Вакансии Backend/Frontend
export default class MessageHandler extends DefaultMessageHandler {
  getPreType(message: Api.Message): MessagePreType | null {
    const vacancyHashTags = ["#вакансия", "#vacancy", "#работа", "#job"]
    const isVacancy = vacancyHashTags.some((tag) => message.message?.toLowerCase()?.includes(tag))
    return isVacancy ? "vacancy" : null
  }
}
