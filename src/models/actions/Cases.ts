import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cases')
export class Case {
  @PrimaryGeneratedColumn('increment')
  public case: number;

  @Column('varchar')
  public guildID: string;

  @Column('varchar')
  public targetID: string;

  @Column('varchar', { 'default': 'No reason specified.' })
  public reason: string;

  @Column('varchar')
  public executorID: string;

  @Column('varchar')
  public caseType: string;
}
