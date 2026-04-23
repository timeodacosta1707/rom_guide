import { Module } from '@nestjs/common';
import { GameClassesService } from './game-classes.service';
import { GameClassesController } from './game-classes.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameClass } from './entities/game-class.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([GameClass])
  ],
  controllers: [GameClassesController],
  providers: [GameClassesService],
})
export class GameClassesModule {}
