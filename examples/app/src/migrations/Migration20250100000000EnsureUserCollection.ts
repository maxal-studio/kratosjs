import { Migration } from '@mikro-orm/migrations-mongodb';

/**
 * App-level migration — ensures the user collection exists with a unique email index.
 */
export class Migration20250100000000EnsureUserCollection extends Migration {
	async up(): Promise<void> {
		const collection = this.getCollection('user');
		await collection.createIndex({ email: 1 }, { unique: true, name: 'user_email_unique' });
	}

	async down(): Promise<void> {
		await this.getCollection('user').dropIndex('user_email_unique');
	}
}
