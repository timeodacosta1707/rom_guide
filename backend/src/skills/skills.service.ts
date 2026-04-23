import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Skill } from './entities/skill.entity';

@Injectable()
export class SkillsService {
  constructor(
    @InjectRepository(Skill)
    private readonly skillRepo: Repository<Skill>,
  ) { }

  async getSkillsForBuild(primaryClass: string, secondaryClass?: string) {
    // 1. Les compétences de base de la classe primaire
    const primarySkills = await this.skillRepo.find({
      where: { primaryClass: { name: primaryClass }, type: 'base' },
      order: { name: 'ASC' }
    });

    const primaryGeneral = primarySkills.filter(s => s.details?.skillCategory === 'Générale');
    const primarySpecific = primarySkills.filter(s => s.details?.skillCategory === 'Spécifique');

    // 2. NOUVEAU : Les compétences de Set (Liées) dépendent UNIQUEMENT de la classe primaire
    const linkedSkills = await this.skillRepo.find({
      where: { primaryClass: { name: primaryClass }, type: 'linked' },
      order: { name: 'ASC' }
    });

    // 3. Les compétences de la classe secondaire et Élites
    let secondaryGeneral: Skill[] = [];
    let eliteSkills: Skill[] = [];

    if (secondaryClass) {
      const secSkills = await this.skillRepo.find({
        where: { primaryClass: { name: secondaryClass }, type: 'base' },
        order: { name: 'ASC' }
      });
      secondaryGeneral = secSkills.filter(s => s.details?.skillCategory === 'Générale');

      eliteSkills = await this.skillRepo.find({
        where: { primaryClass: { name: primaryClass }, requiredSecondaryClass: { name: secondaryClass }, type: 'elite' },
        order: { name: 'ASC' }
      });
    }

    return {
      primaryGeneral,
      primarySpecific,
      secondaryGeneral,
      elite: eliteSkills,
      linked: linkedSkills // Elles sont renvoyées à coup sûr !
    };
  }
}