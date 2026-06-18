import { MikroORM } from '@mikro-orm/core';
import { SqliteDriver } from '@mikro-orm/sqlite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BaseResource, FormBuilder, SelectInput, TableBuilder, TextColumn, TextInput } from '../src';
import { buildEntityResourceSlugMap, enrichFormSchemaRelationships } from '../src/panel/enrichFormSchema';
import type { Panel } from '../src/Panel';
import type { RegisteredResource } from '../src/panel/types';
import { Author, Post } from './entities.sql';

class AuthorResource extends BaseResource {
	static slug = 'authors';
	static entity = Author;
	static label = 'Author';

	static form() {
		return FormBuilder.make().schema([TextInput.make('name').label('Name')]);
	}

	static table() {
		return TableBuilder.make().columns([TextColumn.make('name').label('Name')]);
	}
}

class PostResource extends BaseResource {
	static slug = 'posts';
	static entity = Post;
	static label = 'Post';

	static form() {
		return FormBuilder.make().schema([
			TextInput.make('title').label('Title'),
			SelectInput.make('author').label('Author').relationship('author', 'name', AuthorResource),
		]);
	}

	static table() {
		return TableBuilder.make().columns([TextColumn.make('title').label('Title')]);
	}
}

let orm: MikroORM;
let panel: Panel;

function makePanel(): Panel {
	const resources = new Map<string, RegisteredResource>([
		[
			'authors',
			{
				resourceClass: AuthorResource,
				adapter: null as any,
				hooks: {},
			},
		],
		[
			'posts',
			{
				resourceClass: PostResource,
				adapter: null as any,
				hooks: {},
			},
		],
	]);

	return {
		getOrm: () => orm,
		getResources: () => resources,
	} as unknown as Panel;
}

beforeAll(async () => {
	orm = await MikroORM.init({
		driver: SqliteDriver,
		dbName: ':memory:',
		entities: [Author, Post],
		allowGlobalContext: true,
	});
	await orm.schema.create();
	panel = makePanel();
});

afterAll(async () => {
	await orm.close(true);
});

function findSelectField(schema: any, name: string) {
	const stack = [...(schema.components || [])];
	while (stack.length) {
		const component = stack.pop();
		if (component?.type === 'select' && component.name === name) {
			return component;
		}
		const nested = [...(component?.schema || []), ...(component?.components || [])];
		stack.push(...nested);
	}
	return null;
}

describe('enrichFormSchemaRelationships', () => {
	it('resolves relationship.resource from entity metadata when schema lacks a slug', () => {
		const schema = {
			type: 'form',
			components: [
				{
					type: 'select',
					name: 'author',
					relationship: { name: 'author', titleAttribute: 'name' },
				},
			],
		};

		enrichFormSchemaRelationships(panel, PostResource, schema as any);

		expect(findSelectField(schema, 'author')?.relationship?.resource).toBe('authors');
	});

	it('resolves slug when a resource class is passed to relationship()', () => {
		const schema = FormBuilder.make()
			.schema([SelectInput.make('author').relationship('author', 'name', AuthorResource)])
			.toJSON();

		expect(findSelectField(schema, 'author')?.relationship?.resource).toBe('authors');
	});

	it('leaves an explicitly provided resource slug unchanged', () => {
		const schema = FormBuilder.make()
			.schema([SelectInput.make('author').relationship('author', 'name', 'custom-authors')])
			.toJSON();

		enrichFormSchemaRelationships(panel, PostResource, schema);

		expect(findSelectField(schema, 'author')?.relationship?.resource).toBe('custom-authors');
	});

	it('builds entity name to resource slug map from registered resources', () => {
		const slugMap = buildEntityResourceSlugMap(panel);
		expect(slugMap.get('Author')).toBe('authors');
		expect(slugMap.get('Post')).toBe('posts');
	});
});
