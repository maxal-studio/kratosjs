import 'dotenv/config';
import path from 'path';
import { Panel, LocalMediaAdapter, EmailAuthProvider } from '@maxal_studio/kratosjs';
import { MongoDriver } from '@mikro-orm/mongodb';
import { Migrator } from '@mikro-orm/migrations-mongodb';
import { UserResource } from './resources/UserResource';
import { ShowcaseResource } from './resources/ShowcaseResource';
import { PostResource } from './resources/PostResource';
import { CommentResource } from './resources/CommentResource';
import { User } from './entities/User';
import { seedAdminUser } from './seedAdminUser';
import { seedSampleContent } from './seedSampleContent';
import { Migration20250100000000EnsureUserCollection } from './migrations/Migration20250100000000EnsureUserCollection';

const PORT = 3001;
const uploadsPath = path.join(process.cwd(), 'uploads');
const assetsPath = path.join(process.cwd(), 'assets');

const DATABASE_HOST = process.env.DATABASE_HOST || 'localhost';
const DATABASE_PORT = process.env.DATABASE_PORT || '27017';
const DATABASE_NAME = process.env.DATABASE_NAME || 'kratosjs';

const adminPanel = Panel.make('admin')
	.path('/kratosjs/api')
	.title('KratosJs (MongoDB)')
	.favicon('/assets/icon.png')
	.orm(
		{
			driver: MongoDriver,
			clientUrl: `mongodb://${DATABASE_HOST}:${DATABASE_PORT}`,
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
	.resources([UserResource, ShowcaseResource, PostResource, CommentResource])
	.registerMigrations([Migration20250100000000EnsureUserCollection]);

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
		await seedSampleContent(adminPanel);
		console.log(`🚀 KratosJs API Server running on http://localhost:${PORT}`);
		console.log(`📊 Admin Panel API: ${adminPanel.getBasePath()}`);
		console.log('🔐 Login: admin@example.com / password');
	})
	.catch((error: any) => {
		console.error('Failed to start panel:', error);
		process.exit(1);
	});
