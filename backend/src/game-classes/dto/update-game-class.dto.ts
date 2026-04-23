import { PartialType } from '@nestjs/mapped-types';
import { CreateGameClassDto } from './create-game-class.dto';

export class UpdateGameClassDto extends PartialType(CreateGameClassDto) {}
