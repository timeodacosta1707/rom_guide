import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameClass } from './entities/game-class.entity';
import { CreateGameClassDto } from './dto/create-game-class.dto';
import { UpdateGameClassDto } from './dto/update-game-class.dto';

@Injectable()
export class GameClassesService {
  constructor(
    @InjectRepository(GameClass)
    private readonly gameClassRepo: Repository<GameClass>,
  ) { }

  async create(createGameClassDto: CreateGameClassDto) {
    const newClass = this.gameClassRepo.create(createGameClassDto);
    return await this.gameClassRepo.save(newClass);
  }

  async findAll() {
    return await this.gameClassRepo.find();
  }

  async findOne(id: number) {
    const gameClass = await this.gameClassRepo.findOne({ where: { id } });
    if (!gameClass) {
      throw new NotFoundException(`La classe avec l'ID ${id} est introuvable.`);
    }
    return gameClass;
  }

  async update(id: number, updateGameClassDto: UpdateGameClassDto) {
    await this.findOne(id);
    await this.gameClassRepo.update(id, updateGameClassDto as any);
    return this.findOne(id);
  }

  async remove(id: number) {
    const gameClass = await this.findOne(id);
    return await this.gameClassRepo.remove(gameClass);
  }
}