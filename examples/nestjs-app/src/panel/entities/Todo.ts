import { EntitySchema } from '@mikro-orm/core';

export interface ITodo {
	id: number;
	title: string;
	priority: string;
	done: boolean;
	createdAt: Date;
}

export const Todo = new EntitySchema<ITodo>({
	name: 'Todo',
	properties: {
		id: { type: 'number', primary: true, autoincrement: true },
		title: { type: 'string' },
		priority: { type: 'string', default: 'medium' },
		done: { type: 'boolean', default: false },
		createdAt: { type: 'Date', onCreate: () => new Date() },
	} as any,
});
