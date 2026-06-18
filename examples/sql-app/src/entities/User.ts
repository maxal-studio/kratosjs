import { EntitySchema } from '@mikro-orm/core';

export interface IUser {
	id: number;
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
 * User entity (MySQL)
 */
export const User = new EntitySchema<IUser>({
	name: 'User',
	properties: {
		id: { type: 'number', primary: true, autoincrement: true },
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
