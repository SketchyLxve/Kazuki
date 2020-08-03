import { BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('blacklists')
@Index(['guildID', 'memberID'], { unique: true })
export class Blacklist extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  public id!: string;

  @Column('varchar', { nullable: true })
  public guildID?: string | null;

  @Column('varchar')
  public memberID!: string;

  @Column('text', { array: true, nullable: true })
  public commands?: string[] | null;

  @Column('bool', { 'default': true })
  public global!: boolean;

  @Column('bool', { nullable: false })
  public restricted!: boolean;
}
