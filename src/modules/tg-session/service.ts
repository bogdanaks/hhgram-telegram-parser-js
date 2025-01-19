import { FindOptionsWhere } from "typeorm"
import { AppDataSource } from "shared/db-connection"
import { SessionEntity } from "./entity"
import { decryptString } from "shared/crypto/decrypt"

interface Props {}

export class SessionService {
  protected serviceRepository

  constructor({}: Props) {
    this.serviceRepository = AppDataSource.getRepository<SessionEntity>(SessionEntity)
  }

  async findBy(where: FindOptionsWhere<SessionEntity>) {
    return await this.serviceRepository.find({
      where,
      relations: { session_sources: true },
      order: { request_count: "DESC" },
    })
  }

  async findOneBy(where: FindOptionsWhere<SessionEntity>) {
    return await this.serviceRepository.findOne({ where })
  }

  async save(service: SessionEntity): Promise<SessionEntity> {
    return await this.serviceRepository.save(service)
  }

  async update({ id, ...rest }: { id: string } & Partial<SessionEntity>) {
    return await this.serviceRepository.update(id, rest)
  }

  async delete(id: string) {
    return await this.serviceRepository.delete(id)
  }

  decryptPassword(password: string, iv: string) {
    return decryptString(password, iv)
  }
}
