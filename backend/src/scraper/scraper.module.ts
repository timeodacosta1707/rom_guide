import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScraperService } from './scraper.service';
import { ScraperController } from './scraper.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Race } from 'src/races/entities/race.entity';
import { GameClass } from 'src/game-classes/entities/game-class.entity';
import { Skill } from 'src/skills/entities/skill.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Race, GameClass, Skill]),
    HttpModule
  ],
  providers: [ScraperService],
  exports: [ScraperService],
  controllers: [ScraperController],
})
export class ScraperModule { }



