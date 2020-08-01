import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('mute_tasks')
@Unique('mt_gixmi', ['guildID', 'memberID'])
export class MuteTaskModel {
  @PrimaryGeneratedColumn('rowid')
  public id!: string | number;

  @Column('text')
  public guildID!: string;

  @Column('text')
  public memberID!: string;

  @Column('timestamp', { 'default': () => 'now()' })
  public time!: Date;

  @Column('text', { array: true })
  public roles!: string[];
}
