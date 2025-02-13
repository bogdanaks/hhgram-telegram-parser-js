import { Api } from "telegram"
import DefaultMessageHandler from "./default"
import { MessagePreType } from "../types"

// 1420354620 | QA - Резюме
export default class MessageHandler extends DefaultMessageHandler {
  getPreType(message: Api.Message): MessagePreType | null {
    return "resume"
  }
}
