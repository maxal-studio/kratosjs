import { hashPassword, type Panel } from '@maxal_studio/kratosjs';
import { User } from './entities/User';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password';

/**
 * Ensure a default admin user exists for local login. Run after the panel has
 * mounted (ORM is initialized by `mountKratos` → `panel.start()`).
 */
export async function seedAdminUser(panel: Panel): Promise<void> {
	const em = panel.getOrm().em.fork();
	if (await em.findOne(User, { email: ADMIN_EMAIL })) {
		return;
	}
	const user = em.create(User, {
		name: 'Admin',
		email: ADMIN_EMAIL,
		password: await hashPassword(ADMIN_PASSWORD),
		active: true,
		createdAt: new Date(),
	});
	em.persist(user);
	await em.flush();
	console.log(`👤 Seeded admin user (${ADMIN_EMAIL} / ${ADMIN_PASSWORD})`);
}
