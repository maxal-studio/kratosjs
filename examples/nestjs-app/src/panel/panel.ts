import path from 'node:path';
import { Panel, EmailAuthProvider } from '@maxal_studio/kratosjs';
import { SqliteDriver } from '@mikro-orm/sqlite';
import { User } from './entities/User';
import { Todo } from './entities/Todo';
import { TodoResource } from './resources/TodoResource';
import { UserResource } from './resources/UserResource';

/**
 * Build the KratosJs admin panel. Note what's NOT here:
 *   - no `.httpAdapter()` — `mountKratos()` picks Express/Fastify from the Nest app
 *   - no `.start()`        — `mountKratos()` runs the mount sequence for you
 *
 * `.panelPath('/admin')` keeps the UI off the domain root so NestJS can own '/'.
 */
export function buildAdminPanel(): Panel {
	return Panel.make('admin')
		.title('KratosJs on NestJS')
		.panelPath('/admin')
		.orm(
			{
				driver: SqliteDriver,
				dbName: path.join(process.cwd(), 'nestjs-demo.sqlite'),
				entities: [User, Todo],
				allowGlobalContext: true,
			},
			// SQLite dev convenience: sync the schema instead of running migrations.
			{ migrate: false, updateSchema: true },
		)
		.resources([TodoResource, UserResource])
		.auth({
			jwt: {
				secret: process.env.JWT_SECRET || 'change-me-in-production',
				accessTokenExpiry: '15m',
				refreshTokenExpiry: '7d',
			},
			userEntity: User,
			providers: [new EmailAuthProvider()],
		});
}
