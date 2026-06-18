import { EntitySchema } from '@mikro-orm/core';

/**
 * Test entities for the MongoDB backend.
 * ObjectId primary keys with a serialized string `id`.
 */
export const Author = new EntitySchema<any>({
	name: 'Author',
	properties: {
		_id: { type: 'ObjectId', primary: true },
		id: { type: 'string', serializedPrimaryKey: true },
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
		_id: { type: 'ObjectId', primary: true },
		id: { type: 'string', serializedPrimaryKey: true },
		title: { type: 'string' },
		body: { type: 'string', nullable: true },
		views: { type: 'number', default: 0 },
		published: { type: 'boolean', default: false },
		publishedAt: { type: 'Date', nullable: true },
		author: { kind: 'm:1', entity: () => Author, nullable: true },
	} as any,
});
