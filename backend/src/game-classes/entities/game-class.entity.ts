import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, OneToMany } from 'typeorm';
import { Race } from '../../races/entities/race.entity';
import { Skill } from 'src/skills/entities/skill.entity';

@Entity('classes')
export class GameClass {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'jsonb', nullable: true })
    baseStats: Record<string, number>;

    @Column({ nullable: true })
    iconUrl: string;

    @ManyToMany(() => Race, (race) => race.availableClasses)
    races: Race[];

    @OneToMany(() => Skill, (skill) => skill.primaryClass)
    skills: Skill[];
}