import { FindManyOptions, FindOptionsWhere } from "typeorm"
import { SourceEntity } from "./entity"
import { CreateSource } from "./types"
import { AppDataSource } from "shared/db-connection"
import { Logger } from "winston"

interface Props {
  logger: Logger
}

export class SourceService {
  protected logger
  protected sourceRepository

  constructor({ logger }: Props) {
    this.sourceRepository = AppDataSource.getRepository<SourceEntity>(SourceEntity)
    this.logger = logger
  }

  async findBy(options?: FindManyOptions<SourceEntity>) {
    return await this.sourceRepository.find(options)
  }

  async findOne(where: FindOptionsWhere<SourceEntity>) {
    return await this.sourceRepository.findOne({ where })
  }

  async save(source: CreateSource): Promise<SourceEntity> {
    return await this.sourceRepository.save(source)
  }

  async update({ id, ...rest }: { id: string } & Partial<SourceEntity>) {
    return await this.sourceRepository.update(id, rest)
  }

  async delete(id: string) {
    return await this.sourceRepository.delete(id)
  }
}
