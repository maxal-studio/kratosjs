import { MikroORM, RequestContext as OrmRequestContext, EntityManager } from '@mikro-orm/core';
import type { KratosMiddleware } from '../http/types';

export interface OrmOptions {
	migrate?: boolean;
	updateSchema?: boolean;
}

export type DriverKind = 'mongo' | 'sql';

/**
 * Owns the MikroORM lifecycle for a Panel:
 * - stores the ORM configuration (or an already-initialized instance)
 * - collects entities and migrations registered by plugins
 * - initializes the ORM, runs migrations and optional schema sync during start()
 * - provides the request-scoped EntityManager middleware
 */
export class OrmManager {
	private _orm?: MikroORM;
	private _config?: Record<string, any>;
	private _options: OrmOptions = {};
	private _pluginEntities: any[] = [];
	private _pluginMigrations: Array<new (...args: any[]) => any> = [];

	/**
	 * Store the ORM configuration (initialized later) or an already-initialized instance.
	 */
	configure(config: Record<string, any> | MikroORM, options?: OrmOptions): void {
		if (config instanceof MikroORM) {
			this._orm = config;
		} else {
			this._config = config;
		}
		this._options = options || {};
	}

	/**
	 * Whether the ORM instance is available (initialized or provided directly).
	 */
	isInitialized(): boolean {
		return !!this._orm;
	}

	/**
	 * Determine the database driver kind ('mongo' or 'sql') from the configuration.
	 * Available as soon as configure() has been called — i.e. before the ORM is
	 * initialized — so plugins can build driver-specific entities during register().
	 */
	getDriverKind(): DriverKind {
		if (this._orm) {
			return this._orm.config.getDriver().constructor.name.includes('Mongo') ? 'mongo' : 'sql';
		}
		if (!this._config) {
			throw new Error('Cannot determine driver kind before panel.orm() is called.');
		}
		const driverName: string = this._config.driver?.name ?? '';
		const clientUrl: string = String(this._config.clientUrl ?? '');
		if (driverName.includes('Mongo') || clientUrl.startsWith('mongodb')) {
			return 'mongo';
		}
		return 'sql';
	}

	/**
	 * Get the MikroORM instance (available after initialize()).
	 */
	getOrm(): MikroORM {
		if (!this._orm) {
			throw new Error('ORM not initialized. The ORM is initialized during panel.start().');
		}
		return this._orm;
	}

	/**
	 * Get the context-aware EntityManager.
	 * Inside a request this resolves to the request-scoped fork.
	 */
	getEm(): EntityManager {
		return this.getOrm().em;
	}

	/**
	 * Register MikroORM entities (for plugins).
	 * Entities registered here are merged into the ORM configuration during initialize().
	 */
	registerEntities(entities: any[]): void {
		if (this._orm) {
			throw new Error('Cannot register entities after the ORM has been initialized');
		}
		this._pluginEntities.push(...entities);
	}

	/**
	 * Register MikroORM migration classes (for plugins).
	 * Registered migrations are merged into the ORM's migrationsList and executed
	 * (in registration order) during initialize().
	 */
	registerMigrations(migrations: Array<new (...args: any[]) => any>): void {
		if (this._orm) {
			throw new Error('Cannot register migrations after the ORM has been initialized');
		}
		this._pluginMigrations.push(...migrations);
	}

	/**
	 * Pipeline step that creates a request-scoped MikroORM context (forked EntityManager).
	 * `RequestContext.create` accepts an async callback and returns its promise, so the
	 * forked EntityManager stays bound for the whole downstream chain.
	 */
	contextStep(): KratosMiddleware {
		return async (_req, _reply, next) => {
			if (this._orm) {
				await OrmRequestContext.create(this._orm.em, next);
			} else {
				await next();
			}
		};
	}

	/**
	 * Initialize the MikroORM instance:
	 * - merges resource entities and plugin entities/migrations into the config
	 * - runs pending migrations
	 * - optionally syncs the schema (development convenience / MongoDB index creation)
	 *
	 * @param resourceEntities - Entities collected from registered resources
	 */
	async initialize(resourceEntities: any[]): Promise<void> {
		if (!this._orm) {
			if (!this._config) {
				throw new Error(
					'Panel requires a database configuration. Call panel.orm({ driver, dbName, ... }) before start().',
				);
			}

			// Collect entities: explicit config + resource entities + plugin entities
			const entities = new Set<any>([
				...(this._config.entities || []),
				...resourceEntities,
				...this._pluginEntities,
			]);

			const config: Record<string, any> = {
				...this._config,
				entities: [...entities],
			};

			// Standalone MongoDB (no replica set) does not support transactions,
			// which @mikro-orm/migrations-mongodb uses by default.
			if (this.getDriverKind() === 'mongo' && config.migrations?.transactional === undefined) {
				config.migrations = {
					...config.migrations,
					transactional: false,
				};
			}

			// Merge plugin migrations into the migrations list
			if (this._pluginMigrations.length > 0) {
				const existingList = config.migrations?.migrationsList || [];
				config.migrations = {
					...config.migrations,
					migrationsList: [
						...existingList,
						...this._pluginMigrations.map(MigrationClass => ({
							name: MigrationClass.name,
							class: MigrationClass,
						})),
					],
				};
			}

			this._orm = await MikroORM.init(config as any);
		}

		// Run pending migrations when migrations are configured
		const hasMigrations =
			this._pluginMigrations.length > 0 || !!this._orm.config.get('migrations')?.migrationsList?.length;
		if (this._options.migrate !== false && hasMigrations) {
			try {
				const migrator = this._orm.migrator;
				await migrator.up();
			} catch (error) {
				console.error('Error running migrations:', error);
				throw error;
			}
		}

		// Optional schema sync (development convenience / MongoDB index creation)
		// safe: true only creates missing tables/columns and never drops anything,
		// so it can coexist with migration-managed tables
		if (this._options.updateSchema) {
			const generator: any = this._orm.schema;
			// v7 renamed SchemaGenerator.updateSchema() -> update()
			const updateSchema = generator.update ?? generator.updateSchema;
			if (typeof updateSchema === 'function') {
				await updateSchema.call(generator, { safe: true });
			}
			// MongoDB: ensure indexes exist (not supported by SQL drivers)
			if (this._orm.config.getDriver().constructor.name === 'MongoDriver') {
				try {
					await generator.ensureIndexes();
				} catch (error) {
					console.warn('Failed to ensure indexes:', error);
				}
			}
		}
	}
}
