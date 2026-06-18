import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe } from 'vitest';
import { Author, Post } from './entities.mongo';
import { runAdapterSuite } from './adapterSuite';

let mongod: MongoMemoryServer;
let orm: MikroORM;

beforeAll(async () => {
	mongod = await MongoMemoryServer.create();
	orm = await MikroORM.init({
		driver: MongoDriver,
		clientUrl: mongod.getUri(),
		dbName: 'kratosjs-test',
		entities: [Author, Post],
		allowGlobalContext: true,
		ensureIndexes: false,
	});
});

afterAll(async () => {
	if (orm) {
		await orm.close(true);
	}
	if (mongod) {
		await mongod.stop();
	}
});

describe('MikroOrmAdapter (MongoDB)', () => {
	runAdapterSuite(() => ({ orm, isMongo: true }));
});
