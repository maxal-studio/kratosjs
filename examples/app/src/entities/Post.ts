import { EntitySchema } from '@mikro-orm/core';
import { User, type IUser } from './User';

export interface IPost {
	_id: any;
	id: string;
	title: string;
	content?: string;
	featuredImage?: { key: string; bucket: string; url?: string } | null;
	published: boolean;
	views: number;
	stars?: number;
	author?: IUser;
	createdAt: Date;
}

/**
 * Post entity (MongoDB) with a many-to-one relation to User
 */
export const Post = new EntitySchema<IPost>({
	name: 'Post',
	properties: {
		_id: { type: 'ObjectId', primary: true },
		id: { type: 'string', serializedPrimaryKey: true },
		title: { type: 'string' },
		content: { type: 'string', nullable: true },
		featuredImage: { type: 'json', nullable: true },
		published: { type: 'boolean', default: false },
		views: { type: 'number', default: 0 },
		stars: { type: 'number', default: 0 },
		author: { kind: 'm:1', entity: () => User, nullable: true },
		createdAt: { type: 'Date', onCreate: () => new Date() },
	} as any,
});
