export type DriverKey = 'mysql' | 'postgresql' | 'mariadb' | 'sqlite' | 'mongo';

export interface DriverDescriptor {
	key: DriverKey;
	label: string;
	/** 'sql' | 'mongo' — drives entity PK shape and migration package */
	kind: 'sql' | 'mongo';
	/** npm dependencies (name -> semver) added to the generated app */
	dependencies: Record<string, string>;
	/** Import line for the MikroORM driver, e.g. the MySqlDriver */
	driverImport: string;
	/** Import line for the Migrator extension */
	migratorImport: string;
	/** The object literal passed to panel.orm(...) (multi-line, 2-tab indented body) */
	ormConfig: string;
	/** Entity primary-key properties block (inside `properties: { ... }`) */
	idProps: string;
	/** Primary-key fields for the IUser interface (inside `interface { ... }`) */
	idInterfaceFields: string;
	/** Contents of .env.example (excluding shared JWT/PORT which are appended) */
	envVars: string;
}

const MIKRO_ORM_VERSION = '^7.1.4';

export const DRIVERS: Record<DriverKey, DriverDescriptor> = {
	mysql: {
		key: 'mysql',
		label: 'MySQL',
		kind: 'sql',
		dependencies: {
			'@mikro-orm/mysql': MIKRO_ORM_VERSION,
			'@mikro-orm/migrations': MIKRO_ORM_VERSION,
		},
		driverImport: "import { MySqlDriver } from '@mikro-orm/mysql';",
		migratorImport: "import { Migrator } from '@mikro-orm/migrations';",
		ormConfig: `{
			driver: MySqlDriver,
			host: process.env.DATABASE_HOST || 'localhost',
			port: parseInt(process.env.DATABASE_PORT || '3306'),
			user: process.env.DATABASE_USER || 'root',
			password: process.env.DATABASE_PASSWORD || '',
			dbName: process.env.DATABASE_NAME || 'kratosjs',
			extensions: [Migrator],
		}`,
		idProps: `id: { type: 'number', primary: true, autoincrement: true },`,
		idInterfaceFields: `id: number;`,
		envVars: `DATABASE_HOST="localhost"
DATABASE_PORT="3306"
DATABASE_USER="root"
DATABASE_PASSWORD=""
DATABASE_NAME="kratosjs"`,
	},
	postgresql: {
		key: 'postgresql',
		label: 'PostgreSQL',
		kind: 'sql',
		dependencies: {
			'@mikro-orm/postgresql': MIKRO_ORM_VERSION,
			'@mikro-orm/migrations': MIKRO_ORM_VERSION,
		},
		driverImport: "import { PostgreSqlDriver } from '@mikro-orm/postgresql';",
		migratorImport: "import { Migrator } from '@mikro-orm/migrations';",
		ormConfig: `{
			driver: PostgreSqlDriver,
			host: process.env.DATABASE_HOST || 'localhost',
			port: parseInt(process.env.DATABASE_PORT || '5432'),
			user: process.env.DATABASE_USER || 'postgres',
			password: process.env.DATABASE_PASSWORD || '',
			dbName: process.env.DATABASE_NAME || 'kratosjs',
			extensions: [Migrator],
		}`,
		idProps: `id: { type: 'number', primary: true, autoincrement: true },`,
		idInterfaceFields: `id: number;`,
		envVars: `DATABASE_HOST="localhost"
DATABASE_PORT="5432"
DATABASE_USER="postgres"
DATABASE_PASSWORD=""
DATABASE_NAME="kratosjs"`,
	},
	mariadb: {
		key: 'mariadb',
		label: 'MariaDB',
		kind: 'sql',
		dependencies: {
			'@mikro-orm/mariadb': MIKRO_ORM_VERSION,
			'@mikro-orm/migrations': MIKRO_ORM_VERSION,
		},
		driverImport: "import { MariaDbDriver } from '@mikro-orm/mariadb';",
		migratorImport: "import { Migrator } from '@mikro-orm/migrations';",
		ormConfig: `{
			driver: MariaDbDriver,
			host: process.env.DATABASE_HOST || 'localhost',
			port: parseInt(process.env.DATABASE_PORT || '3306'),
			user: process.env.DATABASE_USER || 'root',
			password: process.env.DATABASE_PASSWORD || '',
			dbName: process.env.DATABASE_NAME || 'kratosjs',
			extensions: [Migrator],
		}`,
		idProps: `id: { type: 'number', primary: true, autoincrement: true },`,
		idInterfaceFields: `id: number;`,
		envVars: `DATABASE_HOST="localhost"
DATABASE_PORT="3306"
DATABASE_USER="root"
DATABASE_PASSWORD=""
DATABASE_NAME="kratosjs"`,
	},
	sqlite: {
		key: 'sqlite',
		label: 'SQLite',
		kind: 'sql',
		dependencies: {
			'@mikro-orm/sqlite': MIKRO_ORM_VERSION,
			'@mikro-orm/migrations': MIKRO_ORM_VERSION,
		},
		driverImport: "import { SqliteDriver } from '@mikro-orm/sqlite';",
		migratorImport: "import { Migrator } from '@mikro-orm/migrations';",
		ormConfig: `{
			driver: SqliteDriver,
			dbName: process.env.DATABASE_NAME || 'kratosjs.sqlite',
			extensions: [Migrator],
		}`,
		idProps: `id: { type: 'number', primary: true, autoincrement: true },`,
		idInterfaceFields: `id: number;`,
		envVars: `DATABASE_NAME="kratosjs.sqlite"`,
	},
	mongo: {
		key: 'mongo',
		label: 'MongoDB',
		kind: 'mongo',
		dependencies: {
			'@mikro-orm/mongodb': MIKRO_ORM_VERSION,
			'@mikro-orm/migrations-mongodb': MIKRO_ORM_VERSION,
		},
		driverImport: "import { MongoDriver } from '@mikro-orm/mongodb';",
		migratorImport: "import { Migrator } from '@mikro-orm/migrations-mongodb';",
		ormConfig: `{
			driver: MongoDriver,
			clientUrl: process.env.DATABASE_URL || 'mongodb://localhost:27017',
			dbName: process.env.DATABASE_NAME || 'kratosjs',
			extensions: [Migrator],
		}`,
		idProps: `_id: { type: 'ObjectId', primary: true },
		id: { type: 'string', serializedPrimaryKey: true },`,
		idInterfaceFields: `_id: any;
	id: string;`,
		envVars: `DATABASE_URL="mongodb://localhost:27017"
DATABASE_NAME="kratosjs"`,
	},
};

export const DRIVER_KEYS = Object.keys(DRIVERS) as DriverKey[];
