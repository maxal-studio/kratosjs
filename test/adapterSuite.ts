import { MikroORM } from '@mikro-orm/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MikroOrmAdapter } from '../src/adapters/database/MikroOrmAdapter';
import type { QueryBuilderRule } from '../src/types';

export interface SuiteContext {
	orm: MikroORM;
	isMongo: boolean;
}

/** Get the raw primary key value of an entity regardless of backend */
const idOf = (entity: any): any => entity._id ?? entity.id;

/** Build a query builder rule */
const rule = (
	field: string,
	operator: string,
	value: any,
	dataType: QueryBuilderRule['dataType'] = 'text',
): QueryBuilderRule => ({
	type: field,
	dataType,
	data: { operator, settings: { field, value } },
});

/**
 * Shared test suite asserting the full DataAdapter contract against a live ORM.
 * Runs identically against SQLite (SQL paths) and MongoDB (NoSQL paths).
 */
export function runAdapterSuite(getCtx: () => SuiteContext): void {
	let orm: MikroORM;
	let isMongo: boolean;
	let authorAdapter: MikroOrmAdapter;
	let postAdapter: MikroOrmAdapter;

	// Raw pk values of seeded records
	let alice: any, bob: any, carol: any;
	let posts: Record<string, any>;

	beforeEach(async () => {
		({ orm, isMongo } = getCtx());
		const em = orm.em.fork();
		await em.nativeDelete('Post', {});
		await em.nativeDelete('Author', {});
		em.clear();
		orm.em.clear();

		alice = em.create('Author', {
			name: 'Alice Wonder',
			email: 'alice@example.com',
			age: 30,
			active: true,
			createdAt: new Date('2024-01-15T10:00:00Z'),
		});
		bob = em.create('Author', {
			name: 'Bob Stone',
			email: 'bob@example.com',
			age: 25,
			active: false,
			createdAt: new Date('2024-02-15T10:00:00Z'),
		});
		carol = em.create('Author', {
			name: 'Carol Reef',
			email: 'carol@books.org',
			age: 35,
			active: true,
			createdAt: new Date('2024-03-15T10:00:00Z'),
		});
		await em.flush();

		posts = {
			hello: em.create('Post', {
				title: 'Hello World',
				body: 'The very first post',
				views: 100,
				published: true,
				publishedAt: new Date('2024-01-20T10:00:00Z'),
				author: alice,
			}),
			sql: em.create('Post', {
				title: 'Intro to SQL',
				body: 'Select all the things',
				views: 50,
				published: false,
				publishedAt: null,
				author: alice,
			}),
			mongo: em.create('Post', {
				title: 'Mongo Basics',
				body: 'Documents everywhere',
				views: 200,
				published: true,
				publishedAt: new Date('2024-02-20T10:00:00Z'),
				author: bob,
			}),
			advanced: em.create('Post', {
				title: 'Advanced Patterns',
				body: null,
				views: 10,
				published: true,
				publishedAt: new Date('2024-03-20T10:00:00Z'),
				author: carol,
			}),
			draft: em.create('Post', {
				title: 'Draft Notes',
				body: null,
				views: 0,
				published: false,
				publishedAt: null,
				author: carol,
			}),
		};
		await em.flush();
		em.clear();

		authorAdapter = new MikroOrmAdapter(orm, 'Author', ['name', 'email']);
		postAdapter = new MikroOrmAdapter(orm, 'Post', ['title']);
	});

	describe('create', () => {
		it('creates a record and returns it with both id and _id aliases', async () => {
			const record = await authorAdapter.create({
				name: 'Dave Crest',
				email: 'dave@example.com',
				age: 40,
				active: true,
			});

			expect(record.name).toBe('Dave Crest');
			expect(record.id).toBeDefined();
			expect(record._id).toBeDefined();
			expect(String(record.id)).toBe(String(record._id));

			const count = await orm.em.fork().count('Author', {});
			expect(count).toBe(4);
		});

		it('drops unknown fields instead of failing', async () => {
			const record = await authorAdapter.create({
				name: 'Eve Field',
				email: 'eve@example.com',
				bogusField: 'should be ignored',
			});

			expect(record.name).toBe('Eve Field');
			expect(record.bogusField).toBeUndefined();
		});

		it('creates a record with a relation set from a foreign key value', async () => {
			const record = await postAdapter.create({
				title: 'Linked Post',
				views: 5,
				published: false,
				author: String(idOf(alice)),
			});

			expect(String(record.author)).toBe(String(idOf(alice)));
		});
	});

	describe('findById', () => {
		it('finds a record by string id', async () => {
			const record = await authorAdapter.findById(String(idOf(alice)));
			expect(record).not.toBeNull();
			expect(record.name).toBe('Alice Wonder');
			expect(String(record.id)).toBe(String(idOf(alice)));
		});

		it('returns null for a missing id', async () => {
			const missingId = isMongo ? '0123456789abcdef01234567' : 999999;
			const record = await authorAdapter.findById(missingId);
			expect(record).toBeNull();
		});

		it('returns null for a malformed id', async () => {
			const record = await authorAdapter.findById('definitely-not-an-id');
			expect(record).toBeNull();
		});
	});

	describe('findByIds', () => {
		it('returns records in input order', async () => {
			const records = await authorAdapter.findByIds([String(idOf(carol)), String(idOf(alice))]);
			expect(records).toHaveLength(2);
			expect(records[0].name).toBe('Carol Reef');
			expect(records[1].name).toBe('Alice Wonder');
		});

		it('skips missing ids', async () => {
			const missingId = isMongo ? '0123456789abcdef01234567' : 999999;
			const records = await authorAdapter.findByIds([String(idOf(bob)), String(missingId)]);
			expect(records).toHaveLength(1);
			expect(records[0].name).toBe('Bob Stone');
		});
	});

	describe('update', () => {
		it('updates fields and persists the change', async () => {
			const updated = await authorAdapter.update(String(idOf(alice)), { name: 'Alice Updated', age: 31 });
			expect(updated.name).toBe('Alice Updated');
			expect(updated.age).toBe(31);

			const reloaded = await authorAdapter.findById(String(idOf(alice)));
			expect(reloaded.name).toBe('Alice Updated');
		});

		it('returns the record unchanged for an empty payload', async () => {
			const updated = await authorAdapter.update(String(idOf(bob)), {});
			expect(updated.name).toBe('Bob Stone');
		});

		it('throws for a missing id', async () => {
			const missingId = isMongo ? '0123456789abcdef01234567' : 999999;
			await expect(authorAdapter.update(String(missingId), { name: 'Nobody' })).rejects.toThrow(/not found/);
		});
	});

	describe('delete', () => {
		it('deletes multiple records and returns the deleted ids', async () => {
			const ids = [String(idOf(alice)), String(idOf(bob))];
			const result = await authorAdapter.delete(ids);
			expect(result.deleted).toEqual(ids);

			const count = await orm.em.fork().count('Author', {});
			expect(count).toBe(1);
		});
	});

	describe('list', () => {
		it('lists all records with default pagination', async () => {
			const result = await authorAdapter.list({});
			expect(result.data).toHaveLength(3);
			expect(result.pagination).toMatchObject({
				page: 1,
				limit: 10,
				total: 3,
				pages: 1,
				hasNext: false,
				hasPrev: false,
			});
		});

		it('paginates results', async () => {
			const result = await authorAdapter.list({ page: 2, perPage: 2 });
			expect(result.data).toHaveLength(1);
			expect(result.pagination).toMatchObject({
				page: 2,
				limit: 2,
				total: 3,
				pages: 2,
				hasNext: false,
				hasPrev: true,
			});
		});

		it('sorts by a field in both directions', async () => {
			const desc = await authorAdapter.list({ sort: 'age', sortDirection: 'desc' });
			expect(desc.data.map((r: any) => r.name)).toEqual(['Carol Reef', 'Alice Wonder', 'Bob Stone']);

			const asc = await authorAdapter.list({ sort: 'age', sortDirection: 'asc' });
			expect(asc.data.map((r: any) => r.name)).toEqual(['Bob Stone', 'Alice Wonder', 'Carol Reef']);
		});

		it('falls back to primary key sort for unknown sort fields', async () => {
			const result = await authorAdapter.list({ sort: 'nonexistentField' });
			expect(result.data).toHaveLength(3);
		});

		it('filters by equality', async () => {
			const result = await authorAdapter.list({ filters: { active: true } });
			expect(result.data).toHaveLength(2);
			expect(result.data.every((r: any) => r.active === true)).toBe(true);
		});

		it('filters by array values ($in)', async () => {
			const result = await authorAdapter.list({ filters: { name: ['Alice Wonder', 'Bob Stone'] } });
			expect(result.data).toHaveLength(2);
		});

		it('filters by id values mapped to the primary key', async () => {
			const result = await authorAdapter.list({ filters: { _id: [idOf(alice), idOf(carol)] } });
			expect(result.data).toHaveLength(2);
		});

		it('filters by date range', async () => {
			const result = await authorAdapter.list({
				filters: { createdAt: { from: '2024-02-01', to: '2024-02-28' } },
			});
			expect(result.data).toHaveLength(1);
			expect(result.data[0].name).toBe('Bob Stone');
		});

		it('ignores empty filter values', async () => {
			const result = await authorAdapter.list({ filters: { name: '', age: null, active: undefined } });
			expect(result.data).toHaveLength(3);
		});

		it('searches case-insensitively across searchable fields', async () => {
			const byName = await authorAdapter.list({ search: 'aLiCe' });
			expect(byName.data).toHaveLength(1);
			expect(byName.data[0].name).toBe('Alice Wonder');

			const byEmail = await authorAdapter.list({ search: 'EXAMPLE.COM' });
			expect(byEmail.data).toHaveLength(2);
		});

		it('requires all search terms to match (AND of ORs)', async () => {
			const result = await authorAdapter.list({ search: 'alice example' });
			expect(result.data).toHaveLength(1);
			expect(result.data[0].name).toBe('Alice Wonder');

			const noMatch = await authorAdapter.list({ search: 'alice books' });
			expect(noMatch.data).toHaveLength(0);
		});

		it('combines search and filters', async () => {
			const result = await authorAdapter.list({ search: 'example', filters: { active: true } });
			expect(result.data).toHaveLength(1);
			expect(result.data[0].name).toBe('Alice Wonder');
		});

		it('populates relations', async () => {
			const result = await postAdapter.list({
				populate: [{ path: 'author' }],
				sort: 'views',
				sortDirection: 'desc',
			});
			expect(result.data[0].title).toBe('Mongo Basics');
			expect(result.data[0].author).toBeTypeOf('object');
			expect(result.data[0].author.name).toBe('Bob Stone');
			// Nested objects also get id/_id aliases
			expect(String(result.data[0].author._id)).toBe(String(result.data[0].author.id));
		});

		it('skips unknown populate paths without failing', async () => {
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const result = await postAdapter.list({ populate: [{ path: 'nonexistentRelation' }] });
			expect(result.data).toHaveLength(5);
			expect(warnSpy).toHaveBeenCalled();
			warnSpy.mockRestore();
		});

		it('filters across relations (relation->field)', async () => {
			const result = await postAdapter.list({ filters: { 'author->name': 'Alice Wonder' } });
			expect(result.data).toHaveLength(2);
			expect(result.data.map((r: any) => r.title).sort()).toEqual(['Hello World', 'Intro to SQL']);
		});

		it('returns no rows when a relation filter matches nothing', async () => {
			const result = await postAdapter.list({ filters: { 'author->name': 'Nobody' } });
			expect(result.data).toHaveLength(0);
			expect(result.pagination.total).toBe(0);
		});
	});

	describe('list with query builder rules', () => {
		const listWith = (rules: QueryBuilderRule[]) => postAdapter.list({ queryBuilders: { default: rules } });

		it('contains (case-insensitive)', async () => {
			const result = await listWith([rule('title', 'contains', 'sql')]);
			expect(result.data).toHaveLength(1);
			expect(result.data[0].title).toBe('Intro to SQL');
		});

		it('startsWith / endsWith', async () => {
			const starts = await listWith([rule('title', 'startsWith', 'hello')]);
			expect(starts.data).toHaveLength(1);
			expect(starts.data[0].title).toBe('Hello World');

			const ends = await listWith([rule('title', 'endsWith', 'basics')]);
			expect(ends.data).toHaveLength(1);
			expect(ends.data[0].title).toBe('Mongo Basics');
		});

		it('equals / notEquals on numbers', async () => {
			const equals = await listWith([rule('views', 'equals', '100', 'number')]);
			expect(equals.data).toHaveLength(1);
			expect(equals.data[0].title).toBe('Hello World');

			const notEquals = await listWith([rule('views', 'notEquals', '0', 'number')]);
			expect(notEquals.data).toHaveLength(4);
		});

		it('equals on booleans', async () => {
			const result = await listWith([rule('published', 'equals', 'true', 'boolean')]);
			expect(result.data).toHaveLength(3);
		});

		it('comparison operators on numbers', async () => {
			expect((await listWith([rule('views', 'greaterThan', '50', 'number')])).data).toHaveLength(2);
			expect((await listWith([rule('views', 'greaterThanOrEqual', '50', 'number')])).data).toHaveLength(3);
			expect((await listWith([rule('views', 'lessThan', '50', 'number')])).data).toHaveLength(2);
			expect((await listWith([rule('views', 'lessThanOrEqual', '10', 'number')])).data).toHaveLength(2);
		});

		it('in / notIn', async () => {
			const inResult = await listWith([rule('title', 'in', ['Hello World', 'Draft Notes'])]);
			expect(inResult.data).toHaveLength(2);

			const notInResult = await listWith([rule('title', 'notIn', ['Hello World', 'Draft Notes'])]);
			expect(notInResult.data).toHaveLength(3);
		});

		it('isNull / isNotNull', async () => {
			const nulls = await listWith([rule('body', 'isNull', undefined)]);
			expect(nulls.data).toHaveLength(2);

			const notNulls = await listWith([rule('body', 'isNotNull', undefined)]);
			expect(notNulls.data).toHaveLength(3);
		});

		it('between / notBetween on numbers', async () => {
			const between = await listWith([rule('views', 'between', ['10', '100'], 'number')]);
			expect(between.data).toHaveLength(3);

			const notBetween = await listWith([rule('views', 'notBetween', ['10', '100'], 'number')]);
			expect(notBetween.data).toHaveLength(2);
		});

		it('date operators (equals, before, after, between)', async () => {
			const equals = await listWith([rule('publishedAt', 'equals', '2024-02-20', 'date')]);
			expect(equals.data).toHaveLength(1);
			expect(equals.data[0].title).toBe('Mongo Basics');

			const before = await listWith([rule('publishedAt', 'before', '2024-02-01', 'date')]);
			expect(before.data).toHaveLength(1);
			expect(before.data[0].title).toBe('Hello World');

			const after = await listWith([rule('publishedAt', 'after', '2024-02-01', 'date')]);
			expect(after.data).toHaveLength(2);

			const between = await listWith([
				rule('publishedAt', 'between', { from: '2024-01-01', to: '2024-02-28' }, 'date'),
			]);
			expect(between.data).toHaveLength(2);
		});

		it('OR groups', async () => {
			const result = await listWith([
				{
					type: 'or',
					data: {
						groups: [
							{ rules: [rule('title', 'contains', 'hello')] },
							{ rules: [rule('title', 'contains', 'mongo')] },
						],
					},
				},
			]);
			expect(result.data).toHaveLength(2);
		});

		it('relation fields in query builder rules', async () => {
			const result = await listWith([rule('author->name', 'contains', 'alice')]);
			expect(result.data).toHaveLength(2);
		});

		it('combines multiple rules with AND', async () => {
			const result = await listWith([
				rule('published', 'equals', 'true', 'boolean'),
				rule('views', 'greaterThan', '50', 'number'),
			]);
			expect(result.data).toHaveLength(2);
		});
	});

	describe('list with grouping', () => {
		it('computes count/sum/avg/min/max metrics per group', async () => {
			const result = await postAdapter.list({
				grouping: {
					by: ['published'],
					metrics: [
						{ name: 'cnt', op: 'count' },
						{ name: 'totalViews', op: 'sum', field: 'views' },
						{ name: 'avgViews', op: 'avg', field: 'views' },
						{ name: 'minViews', op: 'min', field: 'views' },
						{ name: 'maxViews', op: 'max', field: 'views' },
					],
				},
			});

			expect(result.data).toHaveLength(2);
			const publishedGroup = result.data.find((r: any) => !!r.published);
			const draftGroup = result.data.find((r: any) => !r.published);

			expect(publishedGroup.cnt).toBe(3);
			expect(publishedGroup.totalViews).toBe(310);
			expect(publishedGroup.avgViews).toBeCloseTo(310 / 3, 2);
			expect(publishedGroup.minViews).toBe(10);
			expect(publishedGroup.maxViews).toBe(200);

			expect(draftGroup.cnt).toBe(2);
			expect(draftGroup.totalViews).toBe(50);
		});

		it('computes countDistinct and ratio metrics', async () => {
			const result = await postAdapter.list({
				grouping: {
					by: ['published'],
					metrics: [
						{ name: 'cnt', op: 'count' },
						{ name: 'totalViews', op: 'sum', field: 'views' },
						{ name: 'uniqueAuthors', op: 'countDistinct', field: 'author' },
						{
							name: 'viewsPerPost',
							op: 'ratio',
							numerator: 'totalViews',
							denominator: 'cnt',
							precision: 2,
						},
					],
				},
			});

			const publishedGroup = result.data.find((r: any) => !!r.published);
			expect(publishedGroup.uniqueAuthors).toBe(3);
			expect(publishedGroup.viewsPerPost).toBeCloseTo(103.33, 2);

			const draftGroup = result.data.find((r: any) => !r.published);
			expect(draftGroup.uniqueAuthors).toBe(2);
			expect(draftGroup.viewsPerPost).toBe(25);
		});

		it('applies filters before grouping', async () => {
			const result = await postAdapter.list({
				filters: { published: true },
				grouping: {
					by: ['published'],
					metrics: [{ name: 'cnt', op: 'count' }],
				},
			});
			expect(result.data).toHaveLength(1);
			expect(result.data[0].cnt).toBe(3);
		});

		it('sorts and paginates grouped rows', async () => {
			const result = await postAdapter.list({
				sort: 'cnt',
				sortDirection: 'desc',
				page: 1,
				perPage: 1,
				grouping: {
					by: ['published'],
					metrics: [{ name: 'cnt', op: 'count' }],
				},
			});
			expect(result.data).toHaveLength(1);
			expect(result.data[0].cnt).toBe(3);
			expect(result.pagination).toMatchObject({ total: 2, pages: 2, hasNext: true, hasPrev: false });
		});
	});

	describe('buildFiltersQuery', () => {
		it('returns a where object usable with em.count', async () => {
			const where = await postAdapter.buildFiltersQuery({ filters: { published: true } });
			const count = await orm.em.fork().count('Post', where);
			expect(count).toBe(3);
		});

		it('includes search conditions', async () => {
			const where = await authorAdapter.buildFiltersQuery({ search: 'example' });
			const count = await orm.em.fork().count('Author', where);
			expect(count).toBe(2);
		});

		it('resolves relation filters into $in conditions', async () => {
			const where = await postAdapter.buildFiltersQuery({ filters: { 'author->name': 'Carol Reef' } });
			const count = await orm.em.fork().count('Post', where);
			expect(count).toBe(2);
		});

		it('returns an empty object for empty params', async () => {
			const where = await postAdapter.buildFiltersQuery({});
			expect(where).toEqual({});
		});
	});

	describe('listRelated', () => {
		const relation = {
			name: 'posts',
			type: 'hasMany' as const,
			resourceSlug: 'posts',
			label: 'Post',
			pluralLabel: 'Posts',
			localKey: 'id',
			foreignKey: 'author',
			relatedKey: 'id',
		};

		it('lists records related to a parent', async () => {
			const result = await postAdapter.listRelated({
				parentId: String(idOf(alice)),
				relation,
			});
			expect(result.data).toHaveLength(2);
			expect(result.data.map((r: any) => r.title).sort()).toEqual(['Hello World', 'Intro to SQL']);
		});

		it('supports additional filters on related records', async () => {
			const result = await postAdapter.listRelated({
				parentId: String(idOf(carol)),
				relation,
				filters: { published: true },
			});
			expect(result.data).toHaveLength(1);
			expect(result.data[0].title).toBe('Advanced Patterns');
		});
	});

	describe('globalSearch', () => {
		it('searches case-insensitively with OR logic', async () => {
			const results = await authorAdapter.globalSearch('aLiCe', ['name', 'email']);
			expect(results).toHaveLength(1);
			expect(results[0].name).toBe('Alice Wonder');
		});

		it('matches any of the given fields', async () => {
			const results = await authorAdapter.globalSearch('books', ['name', 'email']);
			expect(results).toHaveLength(1);
			expect(results[0].name).toBe('Carol Reef');
		});

		it('limits the number of results', async () => {
			const results = await authorAdapter.globalSearch('o', ['name'], 2);
			expect(results).toHaveLength(2);
		});

		it('returns an empty array for empty inputs', async () => {
			expect(await authorAdapter.globalSearch('', ['name'])).toEqual([]);
			expect(await authorAdapter.globalSearch('alice', [])).toEqual([]);
		});
	});

	describe('setSearchableFields', () => {
		it('updates the fields used by list search', async () => {
			authorAdapter.setSearchableFields(['email']);
			const result = await authorAdapter.list({ search: 'carol@books.org' });
			expect(result.data).toHaveLength(1);
			expect(result.data[0].name).toBe('Carol Reef');
		});
	});
}
