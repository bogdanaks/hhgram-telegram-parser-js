import { FindOptionsWhere, IsNull, Not } from "typeorm"
import { MessageEntity } from "./entity"
import { CreateMessage } from "./types"
import { AppDataSource } from "shared/db-connection"
import { compareText } from "shared/utils"

interface MessageServiceProps {}

export class MessageService {
  protected messageRepository

  constructor({}: MessageServiceProps) {
    this.messageRepository = AppDataSource.getRepository<MessageEntity>(MessageEntity)
  }

  async find() {
    return await this.messageRepository.find({ relations: { source: true, from: true } })
  }

  async findOne(where: FindOptionsWhere<MessageEntity>) {
    return await this.messageRepository.findOne({ where, relations: { source: true, from: true } })
  }

  async getLastMessage(sourceId: string) {
    return await this.messageRepository.findOne({
      where: { source_id: sourceId },
      order: { message_at: "DESC" },
    })
  }

  async findDuplicateOrigin(sourceId: string, text: string) {
    const messages = await this.messageRepository.find({
      where: {
        source_id: sourceId,
        text: Not(IsNull()),
        duplicate_id: IsNull(),
      },
    })
    for (const message of messages) {
      if (!message.text) continue
      const isDuplicate = compareText(message.text, text)
      if (isDuplicate) {
        return message
      }
    }
  }

  async save(source: CreateMessage): Promise<MessageEntity> {
    return await this.messageRepository.save(source)
  }

  async update({ id, ...rest }: { id: string } & Partial<MessageEntity>) {
    return await this.messageRepository.update(id, rest)
  }

  async delete(id: string) {
    return await this.messageRepository.delete(id)
  }
}
