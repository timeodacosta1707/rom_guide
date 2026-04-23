import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as cheerio from 'cheerio';

@Injectable()
export class ScraperService {
    private readonly logger = new Logger(ScraperService.name);
    private readonly baseUrl = 'https://www.wikirom.fr/wiki/index.php?title=';

    constructor(private readonly httpService: HttpService) { }

    private getFormattedUrl(className: string, isElite: boolean): string {
        const name = className.toLowerCase().trim();
        const base = isElite ? 'Compétences_élites' : 'Compétences';
        let preposition = 'de_';
        if (['éclaireur', 'eclaireur'].includes(name)) preposition = "de_l'";
        else if (['sentinelle'].includes(name)) preposition = "de_la_";
        else if (['guerrier', 'mage', 'voleur', 'prêtre', 'pretre', 'chevalier', 'druide', 'sorcier', 'champion'].includes(name)) preposition = "du_";
        const encodedName = encodeURIComponent(name).replace(/'/g, '%27');
        const encodedBase = encodeURIComponent(base).replace(/'/g, '%27');
        return `${this.baseUrl}${encodedBase}_${preposition}${encodedName}`;
    }

    private async fetchHtml(url: string): Promise<cheerio.CheerioAPI> {
        try {
            const response = await firstValueFrom(this.httpService.get(url));
            return cheerio.load(response.data);
        } catch (error) {
            this.logger.error(`Erreur lors de la récupération de ${url}`);
            throw error;
        }
    }

    async scrapeSkillsForClass(className: string) {
        const url = this.getFormattedUrl(className, false);
        this.logger.log(`--- Scraping des compétences de BASE pour : ${url} ---`);

        const $ = await this.fetchHtml(url);
        const skills: any[] = [];
        let currentSkillData: any = null;
        let currentCategory = 'Générale';

        $('.mw-parser-output > *').each((i, element) => {
            const tag = element.tagName.toLowerCase();
            if (tag === 'h2' || tag === 'h3') {
                const titleText = $(element).text().trim().toLowerCase();
                if (titleText.includes('spécifique')) currentCategory = 'Spécifique';
                else if (titleText.includes('générale')) currentCategory = 'Générale';
            }

            if (tag === 'table') {
                $(element).find('tr').each((j, row) => {
                    const cells = $(row).find('td, th');
                    if (j === 0 || cells.length === 0) return;

                    if (cells.length >= 7) {
                        const t0 = $(cells[0]).text().trim();
                        const t1 = $(cells[1]).text().trim();
                        if (t1 === 'Nom' || t0 === 'Icône') return;
                        let offset = (t0 === '') ? 1 : ((!isNaN(Number(t1)) || t1 === '---') ? 0 : 1);
                        let iconUrl = '';
                        const imgTag = $(cells[0]).find('img');
                        if (imgTag.length > 0) {
                            iconUrl = imgTag.attr('src') || '';
                            if (iconUrl.startsWith('/')) iconUrl = 'https://www.wikirom.fr' + iconUrl;
                        }
                        currentSkillData = {
                            name: $(cells[offset]).text().trim(),
                            iconUrl: iconUrl,
                            requiredLevel: $(cells[offset + 1]).text().trim(),
                            cost: $(cells[offset + 2]).text().trim(),
                            range: $(cells[offset + 3]).text().trim(),
                            castTime: $(cells[offset + 4]).text().trim(),
                            cooldown: $(cells[offset + 5]).text().trim(),
                            prerequisites: $(cells[offset + 6]).text().trim(),
                            isUpgradable: $(cells[offset + 7])?.text().trim() || 'Non',
                            skillCategory: currentCategory
                        };
                    } else if (cells.length > 0 && currentSkillData !== null) {
                        const descriptionText = $(cells[cells.length - 1]).text().trim();
                        if (descriptionText && descriptionText !== '') {
                            skills.push({ ...currentSkillData, description: descriptionText, type: 'base' });
                            currentSkillData = null;
                        }
                    }
                });
            }
        });
        this.logger.log(`${skills.length} compétences extraites.`);
        return skills;
    }

    async scrapeEliteSkillsForClass(className: string) {
        const url = this.getFormattedUrl(className, true);
        this.logger.log(`--- Lancement du scraping des ÉLITES sur : ${url} ---`);

        const $ = await this.fetchHtml(url);
        const eliteSkills: any[] = [];
        let currentSecondaryClass = 'Inconnue';
        let currentSkillData: any = null;

        $('.mw-parser-output > *').each((i, element) => {
            const tag = element.tagName.toLowerCase();
            if (tag === 'h2' || tag === 'h3') {
                const titleText = $(element).text().trim();
                if (titleText.includes('/')) {
                    const parts = titleText.split('/');
                    if (parts.length >= 2) currentSecondaryClass = parts[1].replace(/\[.*\]/g, '').trim();
                }
            }

            if (tag === 'table') {
                $(element).find('tr').each((j, row) => {
                    const cells = $(row).find('td, th');
                    if (j === 0 || cells.length === 0) return;

                    if (cells.length >= 7) {
                        const t0 = $(cells[0]).text().trim();
                        const t1 = $(cells[1]).text().trim();
                        if (t1 === 'Nom' || t0 === 'Icône') return;
                        let offset = 0;
                        if (t0 === '') offset = 1;
                        else if (!isNaN(Number(t1)) || t1 === '---') offset = 0;
                        else offset = 1;

                        let iconUrl = '';
                        const imgTag = $(cells[0]).find('img');
                        if (imgTag.length > 0) {
                            iconUrl = imgTag.attr('src') || '';
                            if (iconUrl.startsWith('/')) iconUrl = 'https://www.wikirom.fr' + iconUrl;
                        }

                        currentSkillData = {
                            name: $(cells[offset]).text().trim(),
                            iconUrl: iconUrl,
                            requiredLevel: $(cells[offset + 1]).text().trim(),
                            cost: $(cells[offset + 2]).text().trim(),
                            range: $(cells[offset + 3]).text().trim(),
                            castTime: $(cells[offset + 4]).text().trim(),
                            cooldown: $(cells[offset + 5]).text().trim(),
                            prerequis: $(cells[offset + 6]).text().trim(),
                            isUpgradable: $(cells[offset + 7])?.text().trim() || '',
                        };
                    } else if (cells.length > 0 && currentSkillData !== null) {
                        const descriptionText = $(cells[cells.length - 1]).text().trim();
                        if (descriptionText && descriptionText !== '') {
                            eliteSkills.push({ ...currentSkillData, description: descriptionText, type: 'Élite', secondaryClass: currentSecondaryClass });
                            currentSkillData = null;
                        }
                    }
                });
            }
        });
        this.logger.log(`Résultat : ${eliteSkills.length} compétences élites extraites avec toutes les statistiques et icônes !`);
        return eliteSkills;
    }

    private getClassUrl(className: string): string {
        const formattedName = className.charAt(0).toUpperCase() + className.slice(1).toLowerCase();
        return `${this.baseUrl}Cat%C3%A9gorie:${encodeURIComponent(formattedName).replace(/'/g, '%27')}`;
    }

    private getRaceUrl(raceName: string): string {
        const formattedName = raceName.charAt(0).toUpperCase() + raceName.slice(1).toLowerCase();
        return `${this.baseUrl}Cat%C3%A9gorie:${encodeURIComponent(formattedName)}_(Race_jouable)`;
    }

    async scrapeRaceInfo(raceName: string) {
        const url = this.getRaceUrl(raceName);
        this.logger.log(`--- Scraping de la RACE : ${url} ---`);
        const $ = await this.fetchHtml(url);
        const description = $('.mw-parser-output > p').first().text().trim();
        const availableClasses: string[] = [];

        $('.mw-parser-output h2, .mw-parser-output h3').each((i, el) => {
            const title = $(el).text().trim();
            if (title.includes('Classes disponibles')) {
                $(el).next('ul').find('li').each((j, li) => {
                    let className = $(li).text().trim();
                    if (className.endsWith('s') && className !== 'Puisatiers') className = className.slice(0, -1);
                    availableClasses.push(className);
                });
            }
        });
        return { name: raceName.charAt(0).toUpperCase() + raceName.slice(1).toLowerCase(), description, availableClasses };
    }

    async scrapeClassInfo(className: string) {
        const url = this.getClassUrl(className);
        this.logger.log(`--- Scraping de la CLASSE : ${url} ---`);
        const $ = await this.fetchHtml(url);
        const descriptions: string[] = [];
        $('.mw-parser-output > p').each((i, el) => {
            const text = $(el).text().trim();
            if (text.length > 0) descriptions.push(text);
        });

        const baseStats: Record<string, number> = {};
        $('.mw-parser-output h2, .mw-parser-output h3, .mw-parser-output h4').each((i, el) => {
            const title = $(el).text().trim();
            if (title.includes('Caractéristiques de base')) {
                $(el).next('ul').find('li').each((j, li) => {
                    const parts = $(li).text().trim().split(':');
                    if (parts.length === 2) baseStats[parts[0].trim()] = parseInt(parts[1].trim(), 10);
                });
            }
        });

        const formattedName = className.charAt(0).toUpperCase() + className.slice(1).toLowerCase();
        const safeClassName = className.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const iconUrl = `https://www.wikirom.fr/wiki/images/Icon_${safeClassName}.png`;

        return { name: formattedName, description: descriptions.join('\n\n'), baseStats, iconUrl };
    }

    async scrapeLinkedSkillsForClass(className: string) {
        const url = 'https://www.wikirom.fr/wiki/index.php?title=Comp%C3%A9tences_li%C3%A9es';
        this.logger.log(`\n--- [SCRAPER] Recherche des compétences LIÉES (SET) pour : ${className} ---`);

        const $ = await this.fetchHtml(url);
        const linkedSkills: any[] = [];
        let isInClassSection = false;

        const classTarget = className.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        $('.mw-parser-output > *').each((i, element) => {
            const tag = element.tagName.toLowerCase();
            const rawText = $(element).text().trim();
            const text = rawText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            if (tag === 'h2' || tag === 'h3' || tag === 'h4') {
                if (text.includes(`competences de ${classTarget}`) || text.includes(`competences d'${classTarget}`) || text === classTarget) {
                    isInClassSection = true;
                } else if (isInClassSection && (text.includes('competences de') || text.includes("competences d'")) && !text.includes(classTarget)) {
                    isInClassSection = false;
                }
            }

            if (isInClassSection && tag === 'table') {
                let currentSkillData: any = null;

                $(element).find('tr').each((j, row) => {
                    const cells = $(row).find('td, th');
                    if (cells.length === 0) return;

                    const t0 = $(cells[0]).text().trim();
                    const t1 = $(cells[1]).text().trim();
                    if (t1 === 'Nom' || t0 === 'Icône') return;

                    if (cells.length >= 6 && !t0.includes('Description') && !t0.includes('Localisation')) {
                        let iconUrl = '';
                        const imgTag = $(cells[0]).find('img');
                        if (imgTag.length > 0) {
                            iconUrl = imgTag.attr('src') || imgTag.attr('data-src') || '';
                            if (iconUrl.startsWith('/')) iconUrl = 'https://www.wikirom.fr' + iconUrl;
                            iconUrl = iconUrl.replace('/thumb/', '/').split('.png')[0] + '.png';
                        }

                        let offset = imgTag.length > 0 || t0 === '' ? 1 : 0;
                        const skillName = $(cells[offset]).text().trim();
                        if (!skillName) return;

                        currentSkillData = {
                            name: skillName,
                            iconUrl: iconUrl,
                            requiredLevel: $(cells[offset + 1])?.text().trim() || '1',
                            cost: $(cells[offset + 2])?.text().trim() || '',
                            range: $(cells[offset + 3])?.text().trim() || '',
                            castTime: $(cells[offset + 4])?.text().trim() || 'Instantané',
                            cooldown: $(cells[offset + 5])?.text().trim() || '',
                            description: '',
                            type: 'linked'
                        };
                    }
                    // Si c'est une ligne en dessous (Description ou Set)
                    else if (cells.length >= 2 && currentSkillData) {
                        const label = $(cells[0]).text().trim();

                        if (label.includes('Description')) {
                            currentSkillData.description = $(cells[1]).text().trim();
                        } else if (label.includes('Localisation')) {

                            let contentParts: string[] = [];
                            $(cells[1]).contents().each((_, el) => {
                                const piece = $(el).text().trim();
                                if (piece && piece !== '-' && piece !== '/') {
                                    contentParts.push(piece);
                                }
                            });

                            let content = '';
                            if (contentParts.length > 0) {
                                // 1. Le premier élément est TOUJOURS le nom du set
                                content = contentParts[0];

                                // 2. S'il y a une suite (la localisation), on saute UNE ligne et on regroupe tout avec des espaces
                                if (contentParts.length > 1) {
                                    let suite = contentParts.slice(1).join(' ');
                                    // On supprime les espaces moches devant les points ou virgules (ex: "Sabotonnerre .")
                                    suite = suite.replace(/ \./g, '.').replace(/ \,/g, ',');

                                    content += '\n' + suite;
                                }
                            }

                            if (content && content !== '') {
                                currentSkillData.description += `\n\n[Set : ${content}]`;
                            }
                            // C'est la dernière ligne, on valide le sort
                            linkedSkills.push(currentSkillData);
                            currentSkillData = null;
                        }
                    }
                });
            }
        });

        this.logger.log(`🏁 Bilan : ${linkedSkills.length} compétences de set scrapées pour le ${className}.`);
        return linkedSkills;
    }
}