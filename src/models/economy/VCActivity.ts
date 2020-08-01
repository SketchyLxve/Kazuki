import { Entity, Column, Unique, PrimaryColumn } from 'typeorm';

@Entity('vc')
@Unique('vc_gixmi', ['guildID', 'memberID'])
export class VCActivity {
  @PrimaryColumn('text')
  public guildID!: string;

  @Column('text')
  public memberID!: string;

  @Column('date', { nullable: true })
  public lastJoined?: Date;

  @Column('int', { 'default': 0 })
  public activityLevel!: number;

  @Column('int', { 'default': 0 })
  public currentHours!: number;

  @Column('int', { 'default': 0 })
  public allHours!: number;
}
