import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RacesModule } from './races/races.module';
import { GameClassesModule } from './game-classes/game-classes.module';
import { SkillsModule } from './skills/skills.module';
import { ScraperModule } from './scraper/scraper.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost', // 'postgres' via Docker
      port: 5432,
      username: process.env.DB_USER || 'rom_admin',
      password: process.env.DB_PASSWORD || 'rom_password',
      database: process.env.DB_NAME || 'rom_db',
      autoLoadEntities: true, // Auto-détecte les entités (plus besoin de la liste explicite)
      synchronize: true, // Crée les tables automatiquement (à désactiver en prod)
    }),
    RacesModule,
    GameClassesModule,
    SkillsModule,
    ScraperModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
