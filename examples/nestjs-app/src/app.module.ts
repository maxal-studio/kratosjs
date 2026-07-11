import { Module } from '@nestjs/common';
import { AppController } from './app.controller';

/**
 * The host NestJS application module. It knows nothing about KratosJs — the panel
 * is mounted separately in main.ts via `mountKratos()`.
 */
@Module({
	controllers: [AppController],
})
export class AppModule {}
