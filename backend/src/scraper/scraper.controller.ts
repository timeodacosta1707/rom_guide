import { Controller, Get, Param } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScraperService } from './scraper.service';
import { Race } from '../races/entities/race.entity';
import { GameClass } from '../game-classes/entities/game-class.entity';
import { Skill } from '../skills/entities/skill.entity';

@Controller('scraper')
export class ScraperController {
    constructor(
        private readonly scraperService: ScraperService,
        @InjectRepository(Race) private readonly raceRepo: Repository<Race>,
        @InjectRepository(GameClass) private readonly classRepo: Repository<GameClass>,
        @InjectRepository(Skill) private readonly skillRepo: Repository<Skill>
    ) { }

    @Get('skills/:className')
    async getClassSkills(@Param('className') className: string) {
        return await this.scraperService.scrapeSkillsForClass(className);
    }

    @Get('elites/:className')
    async getEliteSkills(@Param('className') className: string) {
        return await this.scraperService.scrapeEliteSkillsForClass(className);
    }

    @Get('race/:raceName')
    async getRaceInfo(@Param('raceName') raceName: string) {
        return await this.scraperService.scrapeRaceInfo(raceName);
    }

    @Get('class/:className')
    async getClassInfo(@Param('className') className: string) {
        return await this.scraperService.scrapeClassInfo(className);
    }

    @Get('seed/races-and-classes')
    async seedDatabase() {
        const racesToScrape = ['humains', 'elfes', 'nains'];
        const classesToScrape = [
            'guerrier', 'mage', 'voleur', 'éclaireur',
            'prêtre', 'chevalier', 'sentinelle', 'druide',
            'sorcier', 'champion'
        ];

        const savedClasses: Record<string, GameClass> = {};

        for (const className of classesToScrape) {
            console.log(`Extraction et sauvegarde de la classe : ${className}...`);
            const classData = await this.scraperService.scrapeClassInfo(className);

            let gameClass = await this.classRepo.findOne({ where: { name: classData.name } });
            if (!gameClass) {
                gameClass = this.classRepo.create({
                    name: classData.name,
                    description: classData.description,
                    baseStats: classData.baseStats,
                    iconUrl: classData.iconUrl
                });
            } else {
                Object.assign(gameClass, classData);
            }

            savedClasses[classData.name] = await this.classRepo.save(gameClass);
        }

        for (const raceName of racesToScrape) {
            console.log(`Extraction et sauvegarde de la race : ${raceName}...`);
            const raceData = await this.scraperService.scrapeRaceInfo(raceName);

            let race = await this.raceRepo.findOne({ where: { name: raceData.name } });
            if (!race) {
                race = this.raceRepo.create({ name: raceData.name, description: raceData.description });
            } else {
                race.description = raceData.description;
            }

            race.availableClasses = raceData.availableClasses
                .map(className => savedClasses[className])
                .filter(c => c !== undefined);

            await this.raceRepo.save(race);
        }

        for (const className of classesToScrape) {
            console.log(`\n--- Extraction des compétences pour la classe : ${className} ---`);

            const formattedClassName = className.charAt(0).toUpperCase() + className.slice(1).toLowerCase();
            const primaryClassObj = savedClasses[formattedClassName];

            if (!primaryClassObj) continue;

            // --- A. Les compétences de BASE ---
            const baseSkills = await this.scraperService.scrapeSkillsForClass(className);
            for (const skillData of baseSkills) {
                let skill = await this.skillRepo.findOne({
                    where: { name: skillData.name, primaryClass: { id: primaryClassObj.id } }
                });

                if (!skill) {
                    skill = this.skillRepo.create({
                        name: skillData.name,
                        description: skillData.description,
                        type: 'base',
                        iconUrl: skillData.iconUrl,
                        primaryClass: primaryClassObj,
                        details: {
                            skillCategory: skillData.skillCategory,
                            requiredLevel: skillData.requiredLevel,
                            cost: skillData.cost,
                            range: skillData.range,
                            castTime: skillData.castTime,
                            cooldown: skillData.cooldown,
                            prerequisites: skillData.prerequisites,
                            isUpgradable: skillData.isUpgradable
                        }
                    });
                    await this.skillRepo.save(skill);
                }
            }

            // --- B. Les compétences d'ÉLITE ---
            try {
                const eliteSkills = await this.scraperService.scrapeEliteSkillsForClass(className);
                for (const skillData of eliteSkills) {
                    if (!skillData.secondaryClass) continue;

                    const normalizedWikiName = skillData.secondaryClass
                        .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

                    const secondaryClassObj = Object.values(savedClasses).find(cls => {
                        const normalizedDbName = cls.name
                            .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                        return normalizedDbName === normalizedWikiName;
                    });

                    if (secondaryClassObj) {
                        let eliteSkill = await this.skillRepo.findOne({
                            where: {
                                name: skillData.name,
                                primaryClass: { id: primaryClassObj.id },
                                requiredSecondaryClass: { id: secondaryClassObj.id }
                            }
                        });

                        if (!eliteSkill) {
                            eliteSkill = this.skillRepo.create({
                                name: skillData.name,
                                description: skillData.description,
                                type: 'elite',
                                iconUrl: skillData.iconUrl,
                                primaryClass: primaryClassObj,
                                requiredSecondaryClass: secondaryClassObj,
                                details: {
                                    requiredLevel: skillData.requiredLevel,
                                    cost: skillData.cost,
                                    range: skillData.range,
                                    castTime: skillData.castTime,
                                    cooldown: skillData.cooldown,
                                    prerequisites: skillData.prerequis,
                                    isUpgradable: skillData.isUpgradable
                                }
                            });
                            await this.skillRepo.save(eliteSkill);
                        }
                    }
                }
            } catch (e) {
                console.log(`[Info] Pas de compétences élites trouvées ou page inexistante pour ${className}`);
            }

            // --- C. Les compétences de SET (Liées) ---
            try {
                const linkedSkills = await this.scraperService.scrapeLinkedSkillsForClass(className);
                for (const skillData of linkedSkills) {

                    let linkedSkill = await this.skillRepo.findOne({
                        where: { name: skillData.name, primaryClass: { id: primaryClassObj.id }, type: 'linked' }
                    });

                    if (!linkedSkill) {
                        // ON NE PASSE PLUS LA CLASSE SECONDAIRE ICI
                        linkedSkill = this.skillRepo.create({
                            name: skillData.name,
                            description: skillData.description,
                            type: 'linked',
                            iconUrl: skillData.iconUrl,
                            primaryClass: primaryClassObj,
                            details: {
                                requiredLevel: skillData.requiredLevel,
                                cost: skillData.cost,
                                range: skillData.range,
                                castTime: skillData.castTime,
                                cooldown: skillData.cooldown
                            }
                        });
                        await this.skillRepo.save(linkedSkill);
                    }
                }
            } catch (e) {
                console.log(`[Info] Erreur lors de l'extraction des compétences liées pour ${className}`);
            }
        }

        return { message: "Base de données remplie avec succès ! Les tables 'races', 'classes' et 'skills' sont prêtes." };
    }
}