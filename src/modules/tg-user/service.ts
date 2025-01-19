import { FindOptionsWhere } from "typeorm"
import { TgUserEntity } from "./entity"
import { AppDataSource } from "shared/db-connection"
import { CreateTgUser } from "./types"
import { Logger } from "winston"
import { TgUserMiscExtractionEntity } from "./tg-user-misc-extraction.entity"

interface TgUserServiceProps {
  logger: Logger
}

export class TgUserService {
  protected tgUserRepository
  protected tgUserMiscRepository
  protected logger: Logger

  constructor({ logger }: TgUserServiceProps) {
    this.tgUserRepository = AppDataSource.getRepository<TgUserEntity>(TgUserEntity)
    this.tgUserMiscRepository = AppDataSource.getRepository<TgUserMiscExtractionEntity>(
      TgUserMiscExtractionEntity
    )
    this.logger = logger
  }

  async getTgUserBy(where: FindOptionsWhere<TgUserEntity>) {
    return await this.tgUserRepository.findOne({ where })
  }

  async saveTgUser(tgUser: CreateTgUser): Promise<TgUserEntity> {
    return await this.tgUserRepository.save({
      ...tgUser,
      username: tgUser.username?.toLowerCase(),
    })
  }

  async saveTgUserMiscExtraction(identifier: string): Promise<TgUserMiscExtractionEntity> {
    return await this.tgUserMiscRepository.save({ identifier })
  }

  async updateTgUser({ id, ...rest }: { id: string } & Partial<TgUserEntity>) {
    return await this.tgUserRepository.update(id, rest)
  }

  async findTgUserMisc(identifier: string) {
    return await this.tgUserMiscRepository.findOne({
      where: { identifier: identifier },
    })
  }
}
