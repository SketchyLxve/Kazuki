import { Entity, Unique, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('system_channels')
@Unique('sc_nxid', ['name', 'channelID'])
export class SystemChannel {
  @PrimaryGeneratedColumn('rowid')
  public uuid!: string;

  @Column('text')
  public guildID!: string;

  @Column('text')
  public name!: string;

  @Column('text')
  public channelID!: string;
}
