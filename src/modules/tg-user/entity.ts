import "reflect-metadata"
import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity("tg_user")
export class TgUserEntity {
  @PrimaryColumn({ generated: false, type: "bigint" })
  id: string

  @Column({ type: "boolean" })
  premium: boolean

  @Column({ type: "character varying", precision: 100 })
  first_name: string

  @Column({ type: "character varying", precision: 100 })
  last_name: string

  @Column({ type: "character varying", precision: 100 })
  username: string

  @Column({ type: "character varying", precision: 25 })
  phone: string

  @Column({ type: "bigint", nullable: true })
  photo_id: string | null

  @CreateDateColumn()
  created_at: string

  @UpdateDateColumn()
  updated_at: string
}
