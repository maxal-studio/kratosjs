import 'dotenv/config';
import path from 'path';
import { Panel, LocalMediaAdapter, EmailAuthProvider, t, withLocale } from '@maxal_studio/kratosjs';
import { ExpressAdapter, getExpressApp } from '@maxal_studio/kratosjs-express';
import enApp from './lang/en';
import sqApp from './lang/sq';
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
	// The HTTP framework is pluggable — Express is the default adapter.
	.httpAdapter(new ExpressAdapter())
	// Admin UI at '/admin', leaving '/' free for the server-rendered front end below.
	// Views (SSR) are enabled by default — no .views() call needed.
	.panelPath('/admin')
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
	// Multilingual: English + Albanian. The `app` catalog is the SAME module the
	// admin client imports (src/admin/main.tsx), so each string is authored once.
	.i18n({ locales: ['en', 'sq'], defaultLocale: 'en', fallbackLocale: 'en' })
	.registerTranslations('app', { en: enApp, sq: sqApp })
	.resources([UserResource, ShowcaseResource])
	.pages([DashboardPage])
	.registerMigrations([Migration20250100000000CreateUserTable]);

// Custom route demonstrating server-side t(): resolves against the request locale
// (?locale / X-KratosJs-Locale / Accept-Language), with an explicit override too.
// Handlers are framework-neutral (KratosRequest/KratosReply) — the same code runs
// on any HTTP adapter.
adminPanel.registerRoute('get', '/greet', (req, reply) => {
	const name = (req.query.name as string) || 'there';
	reply.json({
		// Active request locale:
		message: t('app:greeting', { name, count: 3 }),
		// Forced Albanian (e.g. a per-recipient email), regardless of request locale:
		albanian: withLocale('sq', () => t('app:greeting', { name, count: 1 })),
	});
});

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
	// To expose extra columns to the client (and req.user), add them once via `extendUser`.
	// It merges over the default user and applies to every provider and endpoint:
	// extendUser: (user) => ({ department: user.department }),
});

adminPanel.useStatic('/assets', assetsPath);

// Server-rendered front page at '/'. `reply.view(component, props)` renders the
// React page in src/views/pages/Home.tsx (SSR on first visit, JSON on client-side
// navigation). Add more with `adminPanel.route('get', '/path', ...)`.
adminPanel.route('get', '/', (_req, reply) =>
	reply.view('Home', {
		title: 'KratosJs (MySQL)',
		adminUrl: adminPanel.getPanelPath(),
		renderedAt: new Date().toISOString(),
	}),
);

// Escape hatch: when you need more than the neutral registerRoute() API
// (raw middleware, streaming, websockets...), grab the framework-native app.
// Register raw routes BEFORE start() so they precede the admin SPA catch-all.
// This ties the route to the Express adapter specifically — prefer
// adminPanel.registerRoute() for anything portable.
const app = getExpressApp(adminPanel);
app.get('/raw-express', (_req, res) => {
	res.send('Served straight from the raw Express app.');
});

adminPanel
	.start(PORT, async () => {
		await seedAdminUser(adminPanel);
		console.log(`🚀 KratosJs SQL Example running on http://localhost:${PORT}`);
		console.log(`🏠 Landing page: http://localhost:${PORT}/`);
		console.log(`📊 Admin Panel: http://localhost:${PORT}${adminPanel.getPanelPath()}`);
		console.log('🔐 Login: admin@example.com / password');
	})
	.catch((error: any) => {
		console.error('Failed to start panel:', error);
		process.exit(1);
	});
