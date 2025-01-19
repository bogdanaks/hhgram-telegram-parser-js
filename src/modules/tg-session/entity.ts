import { SessionSourceEntity } from "modules/session-source"
import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm"

@Entity("session")
export class SessionEntity {
  @PrimaryColumn({ generated: true, type: "bigint" })
  id: string

  @Column({ type: "character varying", precision: 150, nullable: false })
  first_name: string

  @Column({ type: "character varying", precision: 50, nullable: false })
  phone: string

  @Column({ type: "character varying", precision: 50, nullable: false })
  session_name: string

  @Column({ type: "text", nullable: false })
  password: string

  @Column({ type: "text", nullable: false })
  password_iv: string

  @Column({ type: "boolean", default: true, nullable: false })
  is_active: boolean

  @Column({ type: "timestamp with time zone", nullable: true })
  last_request_at: string

  @Column({ type: "integer", default: 0, nullable: false })
  request_count: number

  @OneToMany(() => SessionSourceEntity, (sessionSource) => sessionSource.session)
  session_sources: SessionSourceEntity[]

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: string

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at: string
}
