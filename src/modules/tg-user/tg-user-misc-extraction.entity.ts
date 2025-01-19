import "reflect-metadata"
import { Entity, Column, PrimaryColumn, CreateDateColumn } from "typeorm"

@Entity("tg_user_misc_extraction")
export class TgUserMiscExtractionEntity {
  @PrimaryColumn({ generated: false, type: "bigint" })
  id: string

  @Column({ type: "character varying", precision: 150 })
  identifier: string

  @CreateDateColumn()
  created_at: string
}
