import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { GameClass } from '../../game-classes/entities/game-class.entity';

@Entity('skills')
export class Skill {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ nullable: true })
    iconUrl: string; // Pratique pour afficher les petites icônes dans ton Builder !

    @Column({ default: 'base' })
    type: string; // Sera 'base' ou 'elite'

    @Column({ type: 'jsonb', nullable: true })
    details: Record<string, any>;

    // --- LES RELATIONS ---

    // La classe à laquelle appartient ce sort
    @ManyToOne(() => GameClass, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'primary_class_id' })
    primaryClass: GameClass;

    // Si c'est un sort d'Élite, il a besoin d'une classe secondaire requise
    // (Si c'est null, ça veut dire que c'est un sort de base)
    @ManyToOne(() => GameClass, { nullable: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'required_secondary_class_id' })
    requiredSecondaryClass: GameClass;
}