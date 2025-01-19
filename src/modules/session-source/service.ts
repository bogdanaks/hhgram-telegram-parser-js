import { FindManyOptions, FindOptionsWhere } from "typeorm"
import { SessionSourceEntity } from "./entity"
import { AppDataSource } from "shared/db-connection"
import { Logger } from "winston"

interface Props {
  logger: Logger
}

export class SourceService {
  protected logger
  protected sessionSourceRepository

  constructor({ logger }: Props) {
    this.sessionSourceRepository =
      AppDataSource.getRepository<SessionSourceEntity>(SessionSourceEntity)
    this.logger = logger
  }

  async findBy(options?: FindManyOptions<SessionSourceEntity>) {
    return await this.sessionSourceRepository.find(options)
  }

  async findOne(where: FindOptionsWhere<SessionSourceEntity>) {
    return await this.sessionSourceRepository.findOne({ where })
  }

  async save(source: SessionSourceEntity): Promise<SessionSourceEntity> {
    return await this.sessionSourceRepository.save(source)
  }

  async update({ id, ...rest }: { id: string } & Partial<SessionSourceEntity>) {
    return await this.sessionSourceRepository.update(id, rest)
  }

  async delete(id: string) {
    return await this.sessionSourceRepository.delete(id)
  }
}
