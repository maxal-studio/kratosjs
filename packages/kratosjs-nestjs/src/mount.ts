import type { INestApplication } from '@nestjs/common';
import type { KratosHttpAdapter, Panel } from '@maxal_studio/kratosjs';
import { NestAdapter } from './NestAdapter.js';

/**
 * Mount a KratosJs panel onto an existing NestJS application.
 *
 * Call this in `main.ts` **after** `NestFactory.create()` and **before**
 * `app.listen()`. It detects whether Nest is running on Express or Fastify,
 * builds the matching KratosJs adapter over the Nest app's underlying instance,
 * and runs the panel's mount sequence (init → static → routes → admin SPA).
 * Nest then binds the port via `app.listen()`.
 *
 * @example
 * ```typescript
 * import 'reflect-metadata';
 * import { NestFactory } from '@nestjs/core';
 * import { mountKratos } from '@maxal_studio/kratosjs-nestjs';
 * import { AppModule } from './app.module';
 * import { buildAdminPanel } from './panel';
 *
 * async function bootstrap() {
 *   // bodyParser:false — let KratosJs own JSON parsing (its 50mb limit covers
 *   // base64 media uploads, which Nest's default 100kb parser would 413).
 *   const app = await NestFactory.create(AppModule, { bodyParser: false });
 *   await mountKratos(app, buildAdminPanel());
 *   await app.listen(3000);
 * }
 * bootstrap();
 * ```
 *
 * @remarks
 * On Fastify the panel **API** works, but the admin SPA fallback registers a
 * fastify `setNotFoundHandler`, which can collide with Nest's own — prefer
 * Express for the full admin UI, or serve the built SPA separately and use
 * `panel.adminClient(false)`. See the NestJS integration guide.
 */
export async function mountKratos(app: INestApplication, panel: Panel): Promise<void> {
	const httpAdapter = app.getHttpAdapter();
	const instance = httpAdapter.getInstance();

	const inner = await createInnerAdapter(instance, httpAdapter);
	panel.httpAdapter(new NestAdapter(app, inner));

	// Port 0 is ignored by NestAdapter.listen() (a no-op); Nest binds the real
	// port when the app later calls app.listen(). start() still runs the full
	// mount sequence plus ORM init, plugins, and i18n.
	await panel.start(0);
}

/**
 * Duck-type the platform and lazily import the matching KratosJs adapter so the
 * unused peer dependency isn't required. Fastify instances expose `.inject()`
 * (light-my-request) and `.version`; an Express app does not.
 */
async function createInnerAdapter(instance: any, httpAdapter: { getType?: () => string }): Promise<KratosHttpAdapter> {
	const type = httpAdapter.getType?.();
	const isFastify = type === 'fastify' || (type !== 'express' && typeof instance?.inject === 'function');

	if (isFastify) {
		let mod: typeof import('@maxal_studio/kratosjs-fastify');
		try {
			mod = await import('@maxal_studio/kratosjs-fastify');
		} catch {
			throw new Error(
				'[kratosjs] NestJS is running on Fastify but @maxal_studio/kratosjs-fastify is not installed. ' +
					'Install it: npm install @maxal_studio/kratosjs-fastify',
			);
		}
		return new mod.FastifyAdapter({ app: instance });
	}

	let mod: typeof import('@maxal_studio/kratosjs-express');
	try {
		mod = await import('@maxal_studio/kratosjs-express');
	} catch {
		throw new Error(
			'[kratosjs] NestJS is running on Express but @maxal_studio/kratosjs-express is not installed. ' +
				'Install it: npm install @maxal_studio/kratosjs-express',
		);
	}
	return new mod.ExpressAdapter({ app: instance });
}
