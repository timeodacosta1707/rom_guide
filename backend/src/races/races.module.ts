import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RacesService } from './races.service';
import { RacesController } from './races.controller';
import { Race } from './entities/race.entity'; // Assure-toi que le chemin est bon

@Module({
  // C'est cette ligne qui manquait ! Elle crée le fameux "RaceRepository" pour NestJS
  imports: [TypeOrmModule.forFeature([Race])],
  controllers: [RacesController],
  providers: [RacesService],
})
export class RacesModule { }