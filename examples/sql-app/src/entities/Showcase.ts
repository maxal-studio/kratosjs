import { EntitySchema } from '@mikro-orm/core';
import { User, type IUser } from './User';

export interface IShowcase {
	id: number;
	title: string;
	slug?: string;
	status: string;
	category?: string;
	priority: number;
	price?: number;
	quantity: number;
	stars?: number;
	website?: string;
	phone?: string;
	color?: string;
	description?: string;
	content?: string;
	tags?: string[] | null;
	specs?: Array<{ key: string; value: string; highlighted?: boolean }> | null;
	launchAt?: Date | null;
	publishedAt?: Date | null;
	featuredImage?: { key: string; bucket: string; url?: string } | null;
	gallery?: Array<{ key: string; bucket: string; url?: string }> | null;
	isFeatured: boolean;
	acceptTerms: boolean;
	visibility: string;
	internalNotes?: string;
	source?: string;
	assignee?: IUser | null;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Showcase entity — one column per form field type so the admin panel's
 * entire field/column/filter surface can be exercised against real data.
 */
export const Showcase = new EntitySchema<IShowcase>({
	name: 'Showcase',
	properties: {
		id: { type: 'number', primary: true, autoincrement: true },
		title: { type: 'string' },
		slug: { type: 'string', nullable: true },
		status: { type: 'string', default: 'draft' },
		category: { type: 'string', nullable: true },
		priority: { type: 'number', default: 3 },
		price: { type: 'float', nullable: true },
		quantity: { type: 'number', default: 0 },
		stars: { type: 'number', nullable: true },
		website: { type: 'string', nullable: true },
		phone: { type: 'string', nullable: true },
		color: { type: 'string', nullable: true },
		description: { type: 'text', nullable: true },
		content: { type: 'text', nullable: true },
		tags: { type: 'json', nullable: true },
		specs: { type: 'json', nullable: true },
		launchAt: { type: 'Date', nullable: true },
		publishedAt: { type: 'Date', nullable: true },
		featuredImage: { type: 'json', nullable: true },
		gallery: { type: 'json', nullable: true },
		isFeatured: { type: 'boolean', default: false },
		acceptTerms: { type: 'boolean', default: false },
		visibility: { type: 'string', default: 'public' },
		internalNotes: { type: 'text', nullable: true },
		source: { type: 'string', nullable: true },
		assignee: { kind: 'm:1', entity: () => User, nullable: true },
		createdAt: { type: 'Date', onCreate: () => new Date() },
		updatedAt: { type: 'Date', onCreate: () => new Date(), onUpdate: () => new Date() },
	} as any,
});
