import { EntitySchema } from '@mikro-orm/core';

export interface IUser {
	id: number;
	name: string;
	email: string;
	password?: string;
	active: boolean;
	createdAt: Date;
}

export const User = new EntitySchema<IUser>({
	name: 'User',
	properties: {
		id: { type: 'number', primary: true, autoincrement: true },
		name: { type: 'string' },
		email: { type: 'string', unique: true },
		password: { type: 'string', hidden: true },
		active: { type: 'boolean', default: true },
		createdAt: { type: 'Date', onCreate: () => new Date() },
	} as any,
});
