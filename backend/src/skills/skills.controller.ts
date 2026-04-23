import { Controller, Get, Query } from '@nestjs/common';
import { SkillsService } from './skills.service';

@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) { }

  // On écoute sur /skills/build?primary=Guerrier&secondary=Mage
  @Get('build')
  async getBuildSkills(
    @Query('primary') primary: string,
    @Query('secondary') secondary?: string,
  ) {
    return await this.skillsService.getSkillsForBuild(primary, secondary);
  }
}