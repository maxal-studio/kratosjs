import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { mountKratos } from '@maxal_studio/kratosjs-nestjs';
import { AppModule } from './app.module';
import { buildAdminPanel } from './panel/panel';
import { seedAdminUser } from './panel/seed';

const PORT = Number(process.env.PORT) || 3000;

async function bootstrap() {
	// bodyParser:false — let KratosJs own JSON parsing (its 50mb limit covers
	// base64 media uploads, which Nest's default 100kb parser would 413).
	const app = await NestFactory.create(AppModule, { bodyParser: false });

	const panel = buildAdminPanel();

	// Detects Express, mounts the panel's routes + admin SPA onto the Nest app,
	// and runs panel.start(0) (ORM init, plugins, i18n) — without binding a port.
	await mountKratos(app, panel);

	// ORM is ready now — seed a login user.
	await seedAdminUser(panel);

	// Nest owns listening.
	await app.listen(PORT);

	console.log(`\n🪺  NestJS app:       http://localhost:${PORT}/`);
	console.log(`🛠️   KratosJs panel:   http://localhost:${PORT}/admin`);
	console.log(`🔌  Panel API:        http://localhost:${PORT}${panel.getBasePath()}`);
	console.log('🔐  Login:            admin@example.com / password\n');
}

bootstrap().catch(error => {
	console.error('Failed to start:', error);
	process.exit(1);
});
