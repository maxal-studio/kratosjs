import { EntitySchema } from '@mikro-orm/core';

export interface IUser {
	_id: any;
	id: string;
	firstname: string;
	lastname?: string;
	email: string;
	password?: string;
	phone?: string;
	profileMediaImage?: { key: string; bucket: string; url?: string } | null;
	active: boolean;
	createdAt: Date;
}

/**
 * User entity (MongoDB)
 * Uses an ObjectId primary key with a serialized string `id`.
 */
export const User = new EntitySchema<IUser>({
	name: 'User',
	properties: {
		_id: { type: 'ObjectId', primary: true },
		id: { type: 'string', serializedPrimaryKey: true },
		firstname: { type: 'string' },
		lastname: { type: 'string', nullable: true },
		email: { type: 'string' },
		password: { type: 'string', hidden: true },
		phone: { type: 'string', nullable: true },
		profileMediaImage: { type: 'json', nullable: true },
		active: { type: 'boolean', default: true },
		createdAt: { type: 'Date', onCreate: () => new Date() },
	} as any,
});
