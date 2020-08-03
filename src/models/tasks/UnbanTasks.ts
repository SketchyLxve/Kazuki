import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('unban_tasks')
@Unique('ut_gixmi', ['guildID', 'memberID'])
export class UnbanTaskModel {
  @PrimaryGeneratedColumn('increment')
  public id!: string | number;

  @Column('text')
  public guildID!: string;

  @Column('text')
  public memberID!: string;

  @Column('timestamp', { 'default': () => 'now()' })
  public time!: Date;
}
