import { SessionEntity } from "modules/tg-session"
import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm"

@Entity("session_source")
export class SessionSourceEntity {
  @PrimaryColumn({ generated: true, type: "bigint" })
  id: string

  @Column({ type: "bigint" })
  source_id: string

  @Column({ type: "bigint" })
  session_id: string

  @ManyToOne(() => SessionEntity, (session) => session.id)
  @JoinColumn({ name: "session_id" })
  session: SessionEntity

  @CreateDateColumn()
  created_at: string

  @UpdateDateColumn()
  updated_at: string
}
