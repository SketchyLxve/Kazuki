import { Unique, Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('mute_roles')
@Unique('mr_gixmi', ['guildID', 'memberID'])
export class MuteRole {
  @PrimaryGeneratedColumn('rowid')
  public uuid!: string;

  @Column('text')
  public guildID!: string;

  @Column('text')
  public memberID!: string;

  @Column('text', { array: true })
  public roles!: string[];
}
