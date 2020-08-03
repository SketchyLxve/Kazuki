import { Column, PrimaryGeneratedColumn, Entity, Unique } from 'typeorm';

@Entity('ban_configuration')
@Unique('bc_gixmi', ['guildID', 'memberID'])
export class BanConfiguration {
  @PrimaryGeneratedColumn('rowid')
  public rowid!: string;

  @Column('varchar')
  public guildID!: string;

  @Column('varchar')
  public memberID!: string;

  @Column('varchar')
  public imageLink!: string;
}
