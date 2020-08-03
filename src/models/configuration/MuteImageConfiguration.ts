import { Entity, Unique, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('mute_configuration')
@Unique('mc_gixmi', ['guildID', 'memberID'])
export class MuteConfiguration {
  @PrimaryGeneratedColumn('rowid')
  public uuid!: string;

  @Column('text')
  public guildID!: string;

  @Column('text')
  public memberID!: string;

  @Column('text')
  public imageLink!: string;
}
