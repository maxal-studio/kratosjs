import { EntitySchema } from '@mikro-orm/core';

/**
 * Test entities for SQL backends (SQLite in-memory).
 * Numeric auto-increment primary keys.
 */
export const Author = new EntitySchema<any>({
	name: 'Author',
	properties: {
		id: { type: 'number', primary: true, autoincrement: true },
		name: { type: 'string' },
		email: { type: 'string' },
		age: { type: 'number', nullable: true },
		active: { type: 'boolean', default: false },
		createdAt: { type: 'Date', nullable: true },
	} as any,
});

export const Post = new EntitySchema<any>({
	name: 'Post',
	properties: {
		id: { type: 'number', primary: true, autoincrement: true },
		title: { type: 'string' },
		body: { type: 'string', nullable: true },
		views: { type: 'number', default: 0 },
		published: { type: 'boolean', default: false },
		publishedAt: { type: 'Date', nullable: true },
		author: { kind: 'm:1', entity: () => Author, nullable: true },
	} as any,
});
