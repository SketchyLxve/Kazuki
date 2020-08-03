import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('demote_roles')
export class DemoteRoles {
  @PrimaryColumn('text', { unique: true })
  public guildID!: string;

  @Column('text', { array: true })
  public roles!: string[];
}
