import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { GameClassesService } from './game-classes.service';
import { CreateGameClassDto } from './dto/create-game-class.dto';
import { UpdateGameClassDto } from './dto/update-game-class.dto';

@Controller('game-classes')
export class GameClassesController {
  constructor(private readonly gameClassesService: GameClassesService) { }

  @Post()
  async create(@Body() createGameClassDto: CreateGameClassDto) {
    return await this.gameClassesService.create(createGameClassDto);
  }

  @Get()
  async findAll() {
    return await this.gameClassesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.gameClassesService.findOne(+id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateGameClassDto: UpdateGameClassDto) {
    return await this.gameClassesService.update(+id, updateGameClassDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.gameClassesService.remove(+id);
  }
}