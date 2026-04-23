import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Race } from './entities/race.entity';

@Injectable()
export class RacesService {
  constructor(
    @InjectRepository(Race)
    private readonly raceRepo: Repository<Race>,
  ) { }

  async findAll() {
    return await this.raceRepo.find({
      relations: ['availableClasses'],
    });
  }
}