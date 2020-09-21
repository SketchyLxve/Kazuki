import { BaseEntity, Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";

@Entity('jail_members')
export class HornyJailMember extends BaseEntity {
    @PrimaryGeneratedColumn('increment')
    public iid!: string;

    @Column('varchar')
    public id!: string;

    @Column('varchar')
    public guildID!: string;

    @Column('varchar')
    public name!: string;
}