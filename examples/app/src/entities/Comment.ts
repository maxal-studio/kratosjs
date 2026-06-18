import { EntitySchema } from '@mikro-orm/core';
import { Post, type IPost } from './Post';
import { User, type IUser } from './User';

export interface IComment {
	_id: any;
	id: string;
	comment: string;
	post?: IPost;
	user?: IUser;
	createdAt: Date;
}

/**
 * Comment entity (MongoDB) with many-to-one relations to Post and User
 */
export const Comment = new EntitySchema<IComment>({
	name: 'Comment',
	properties: {
		_id: { type: 'ObjectId', primary: true },
		id: { type: 'string', serializedPrimaryKey: true },
		comment: { type: 'string' },
		post: { kind: 'm:1', entity: () => Post, nullable: true },
		user: { kind: 'm:1', entity: () => User, nullable: true },
		createdAt: { type: 'Date', onCreate: () => new Date() },
	} as any,
});
