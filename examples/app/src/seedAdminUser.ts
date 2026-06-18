import { hashPassword, type Panel } from '@maxal_studio/kratosjs';
import { User } from './entities/User';

const DEFAULT_ADMIN_EMAIL = 'admin@example.com';
const DEFAULT_ADMIN_PASSWORD = 'password';

/**
 * Ensure a default admin user exists for local development login.
 */
export async function seedAdminUser(panel: Panel): Promise<void> {
	const em = panel.getOrm().em.fork();
	const existing = await em.findOne(User, { email: DEFAULT_ADMIN_EMAIL });

	if (existing) {
		return;
	}

	const hashedPassword = await hashPassword(DEFAULT_ADMIN_PASSWORD);
	const user = em.create(User, {
		firstname: 'Admin',
		email: DEFAULT_ADMIN_EMAIL,
		password: hashedPassword,
		active: true,
		createdAt: new Date(),
	});

	em.persist(user);
	await em.flush();
	console.log(`👤 Seeded admin user (${DEFAULT_ADMIN_EMAIL} / ${DEFAULT_ADMIN_PASSWORD})`);
}
