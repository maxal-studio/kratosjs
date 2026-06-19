import 'dotenv/config';
import path from 'path';
import { Panel, LocalMediaAdapter, EmailAuthProvider } from '@maxal_studio/kratosjs';
import { MySqlDriver } from '@mikro-orm/mysql';
import { Migrator } from '@mikro-orm/migrations';
import { UserResource } from './resources/UserResource';
import { ShowcaseResource } from './resources/ShowcaseResource';
import { DashboardPage } from './pages/DashboardPage';
import { User } from './entities/User';
import { seedAdminUser } from './seedAdminUser';
import { Migration20250100000000CreateUserTable } from './migrations/Migration20250100000000CreateUserTable';

const PORT = 3002;
const uploadsPath = path.join(process.cwd(), 'uploads');
const assetsPath = path.join(process.cwd(), 'assets');

const DATABASE_USER = process.env.DATABASE_USER || 'root';
const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD || '';
const DATABASE_HOST = process.env.DATABASE_HOST || 'localhost';
const DATABASE_PORT = parseInt(process.env.DATABASE_PORT || '3306');
const DATABASE_NAME = process.env.DATABASE_NAME || 'kratosjs';

const adminPanel = Panel.make('admin')
	.title('KratosJs (MySQL)')
	.favicon('/assets/icon.png')
	.icon('/assets/icon.png')
	.orm(
		{
			driver: MySqlDriver,
			host: DATABASE_HOST,
			port: DATABASE_PORT,
			user: DATABASE_USER,
			password: DATABASE_PASSWORD,
			dbName: DATABASE_NAME,
			extensions: [Migrator],
		},
		{ migrate: true, updateSchema: true },
	)
	.mediaAdapters([
		new LocalMediaAdapter({
			name: 'local-uploads',
			uploadPath: uploadsPath,
			publicUrl: `http://localhost:${PORT}/uploads`,
			createDirectories: true,
			isDefault: true,
		}),
	])
	.resources([UserResource, ShowcaseResource])
	.pages([DashboardPage])
	.registerMigrations([Migration20250100000000CreateUserTable]);

// App-level custom component names (informational metadata only — rendering is
// driven by the client registry in src/admin/main.tsx). Optional, but keeps the
// panel metadata complete for tooling/introspection.
adminPanel.registerCustomField('star-rating');
adminPanel.registerCustomColumn('star-rating');
adminPanel.registerCustomBlock('callout');

adminPanel.auth({
	jwt: {
		secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
		accessTokenExpiry: '15m',
		refreshTokenExpiry: '7d',
	},
	// `userEntity` enables default validateCredentials + getUserById.
	userEntity: User,
	providers: [new EmailAuthProvider()],
});

adminPanel.useStatic('/assets', assetsPath);

adminPanel
	.start(PORT, async () => {
		await seedAdminUser(adminPanel);
		console.log(`🚀 KratosJs SQL Example running on http://localhost:${PORT}`);
		console.log(`📊 Admin Panel API: ${adminPanel.getBasePath()}`);
		console.log('🔐 Login: admin@example.com / password');
	})
	.catch((error: any) => {
		console.error('Failed to start panel:', error);
		process.exit(1);
	});
