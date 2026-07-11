import type { EntityManager } from '@mikro-orm/core';
import type { Panel } from '../Panel.js';

/**
 * Base class for Panel plugins
 *
 * Plugins extend Panel functionality by registering resources, pages, hooks, routes,
 * database entities, and migrations. Plugins are registered at the start of Panel.start(),
 * BEFORE the ORM is initialized, so any entities and migrations they register are part
 * of the ORM configuration and migrations run.
 *
 * @example
 * ```typescript
 * export class CmsPlugin extends Plugin {
 *   getName(): string {
 *     return 'cms';
 *   }
 *
 *   register(panel: Panel): void {
 *     // Register the plugin's own database entities (MikroORM EntitySchema or classes)
 *     panel.registerEntities([PostEntity, CategoryEntity]);
 *
 *     // Register the plugin's own migrations (run automatically on start)
 *     panel.registerMigrations([CreateCmsTablesMigration]);
 *
 *     // Register resources backed by those entities
 *     panel.registerResource(PostResource);
 *     panel.registerResource(CategoryResource);
 *
 *     // Register routes (framework-neutral: the same handler runs on any HTTP adapter)
 *     panel.registerRoute('get', '/cms/stats', (req, reply) => {
 *       reply.json({ message: 'Hello from plugin!' });
 *     });
 *   }
 *
 *   // Optional: runs after the ORM is initialized and migrations have run.
 *   // Useful for seeding data.
 *   async boot(em: EntityManager): Promise<void> {
 *     if ((await em.count('Category')) === 0) {
 *       em.create('Category', { name: 'General' });
 *       await em.flush();
 *     }
 *   }
 * }
 * ```
 */
export abstract class Plugin {
	/**
	 * Get the unique name/identifier for this plugin
	 * @returns Plugin name
	 */
	abstract getName(): string;

	/**
	 * Register the plugin with the panel
	 * This method is called during Panel.start() after all configuration is complete
	 * but BEFORE the ORM is initialized and routes are mounted. Plugins can register
	 * resources, pages, routes, hooks, custom components, database entities
	 * (panel.registerEntities) and migrations (panel.registerMigrations).
	 *
	 * @param panel - The Panel instance to register with
	 */
	abstract register(panel: Panel): void | Promise<void>;

	/**
	 * Optional boot hook, called during Panel.start() AFTER the ORM has been initialized
	 * and migrations have run. Receives a forked EntityManager, so it is safe to query
	 * and persist data here (e.g. for seeding).
	 *
	 * @param em - A forked, request-independent EntityManager
	 * @param panel - The Panel instance
	 */
	boot?(em: EntityManager, panel: Panel): void | Promise<void>;
}
