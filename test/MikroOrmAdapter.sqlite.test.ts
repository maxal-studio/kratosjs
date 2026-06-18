import { MikroORM } from '@mikro-orm/core';
import { SqliteDriver } from '@mikro-orm/sqlite';
import { afterAll, beforeAll, describe } from 'vitest';
import { Author, Post } from './entities.sql';
import { runAdapterSuite } from './adapterSuite';

let orm: MikroORM;

beforeAll(async () => {
	orm = await MikroORM.init({
		driver: SqliteDriver,
		dbName: ':memory:',
		entities: [Author, Post],
		allowGlobalContext: true,
	});
	await orm.schema.create();
});

afterAll(async () => {
	await orm.close(true);
});

describe('MikroOrmAdapter (SQLite)', () => {
	runAdapterSuite(() => ({ orm, isMongo: false }));
});
