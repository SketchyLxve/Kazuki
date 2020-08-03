import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('guilds')
export class Guild {
  @PrimaryColumn('text', { unique: true })
  public guildID!: string;

  @Column('int')
  public memberCount!: number;

  @Column('text', { nullable: false })
  public ownerID!: string;

  @Column('text', { 'array': true, 'default': '{"nml!", "nml ", "nml"}' })
  public prefixes!: string[];
}
