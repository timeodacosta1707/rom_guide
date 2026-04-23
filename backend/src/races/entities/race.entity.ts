import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable } from 'typeorm';
import { GameClass } from '../../game-classes/entities/game-class.entity';

@Entity('races')
export class Race {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @ManyToMany(() => GameClass, (gameClass) => gameClass.races, { cascade: true })
    @JoinTable({
        name: 'race_classes',
        joinColumn: { name: 'race_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'class_id', referencedColumnName: 'id' },
    })
    availableClasses: GameClass[];
}