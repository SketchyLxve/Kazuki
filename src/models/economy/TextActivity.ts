import { Entity, Column, Unique, PrimaryColumn } from 'typeorm';

@Entity('activity')
@Unique('text_gixmi', ['guildID', 'memberID'])
export class Activity {
  @PrimaryColumn('text')
  public guildID!: string;

  @Column('text')
  public memberID!: string;

  @Column('timestamp', { 'default': () => 'now()' })
  public lastPosted!: Date;

  @Column('text', { nullable: true })
  public channelID?: string;

  @Column('text', { nullable: true })
  public messageID?: string;

  @Column('int', { 'default': 0 })
  public activityLevel!: number;

  @Column('int', { 'default': 0 })
  public currentMessages!: number;

  @Column('int', { 'default': 0 })
  public allMessages!: number;
}
