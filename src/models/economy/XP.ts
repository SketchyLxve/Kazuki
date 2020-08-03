import { Entity, Column, Unique, PrimaryGeneratedColumn } from 'typeorm';

@Entity('xp')
@Unique('xp_gixmi', ['guildID', 'memberID'])
export class XP {
  @PrimaryGeneratedColumn('rowid')
  public uuid!: string;

  @Column('text', { unique: false })
  public guildID!: string;

  @Column('text')
  public memberID!: string;

  @Column('int', { 'default': 0 })
  public xp!: number;

  @Column('int', { 'default': 0 })
  public level!: number;
}
