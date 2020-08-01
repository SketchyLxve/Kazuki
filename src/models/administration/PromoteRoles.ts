import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('promote_roles')
@Unique('pr_gixlvl', ['guildID', 'level'])
export class PromoteRoles {
  @PrimaryGeneratedColumn('rowid')
  public uuid!: string;

  @Column('varchar')
  public category!: string;

  @Column('varchar', { unique: false })
  public guildID!: string;

  @Column('int')
  public level!: number;

  @Column('varchar', { array: true, nullable: false })
  public roles!: string[];

  @Column('bool', { 'default': true })
  public stripExistent!: boolean;
}
