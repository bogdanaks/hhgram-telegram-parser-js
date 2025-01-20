import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity("source")
export class SourceEntity {
  @PrimaryColumn({ generated: false, type: "bigint" })
  id: string

  @Column({ type: "character varying", precision: 200 })
  title: string

  @Column({ type: "bigint" })
  photo_id: string

  @Column({ type: "character varying", precision: 150 })
  username: string

  @Column({ type: "character varying", precision: 20 })
  type: string

  @Column({ type: "boolean" })
  is_active: boolean

  @Column({ type: "boolean" })
  is_seeded: boolean

  @CreateDateColumn()
  created_at: string

  @UpdateDateColumn()
  updated_at: string
}
