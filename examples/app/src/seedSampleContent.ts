import type { Panel } from '@maxal_studio/kratosjs';
import { User } from './entities/User';
import { Post } from './entities/Post';
import { Comment } from './entities/Comment';

/**
 * Seed a demo post with comments when the database has no comments yet.
 */
export async function seedSampleContent(panel: Panel): Promise<void> {
	const em = panel.getOrm().em.fork();
	const commentCount = await em.count(Comment, {});

	if (commentCount > 0) {
		return;
	}

	const admin = await em.findOne(User, { email: 'admin@example.com' });
	if (!admin) {
		return;
	}

	let post = await em.findOne(Post, { title: 'Welcome to KratosJs' });
	if (!post) {
		post = em.create(Post, {
			title: 'Welcome to KratosJs',
			content: 'A sample post with comments and a featured image slot.',
			published: true,
			views: 42,
			author: admin,
			createdAt: new Date(),
		});
	}

	em.create(Comment, {
		comment: 'Great intro post!',
		post,
		user: admin,
		createdAt: new Date(),
	});
	em.create(Comment, {
		comment: 'Looking forward to more content.',
		post,
		user: admin,
		createdAt: new Date(),
	});

	await em.flush();
	console.log('📝 Seeded sample post with comments');
}
