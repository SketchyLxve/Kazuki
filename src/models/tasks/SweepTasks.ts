import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('sweep_tasks')
@Unique('gixmi', ['guildID', 'targetID'])
export class SweepTaskModel {
  @PrimaryGeneratedColumn('rowid')
  public id!: string;

  @Column('varchar')
  public guildID!: string;

  @Column('varchar')
  public targetID!: string;

  @Column('varchar')
  public time!: Date;
}
