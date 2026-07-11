import 'reflect-metadata';
import { EntitySchema } from '@mikro-orm/core';
import { SqliteDriver } from '@mikro-orm/sqlite';
import { Controller, Get, Module, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BaseResource, FormBuilder, Panel, TableBuilder, TextColumn, TextInput } from '@maxal_studio/kratosjs';
import { mountKratos } from '../src/index.js';

/**
 * End-to-end proof that a KratosJs panel mounts onto a real NestJS (Express) app:
 * Nest keeps its own routes ('/'), while the panel's API + composed CRUD pipeline
 * serve under the base path — all bound by Nest's single app.listen().
 */

const Todo = new EntitySchema<any>({
	name: 'Todo',
	properties: {
		id: { type: 'number', primary: true, autoincrement: true },
		title: { type: 'string' },
		done: { type: 'boolean', default: false },
	} as any,
});

class TodoResource extends BaseResource {
	static slug = 'todos';
	static entity = Todo;
	static label = 'Todo';

	static form() {
		return FormBuilder.make().schema([TextInput.make('title').label('Title')]);
	}

	static table() {
		return TableBuilder.make().columns([TextColumn.make('title').label('Title')]);
	}
}

@Controller()
class AppController {
	@Get()
	root() {
		return 'nest-root';
	}
}

@Module({ controllers: [AppController] })
class AppModule {}

const basePath = '/kratosjs/api';
let app: INestApplication;
let panel: Panel;
let baseUrl: string;

beforeAll(async () => {
	// bodyParser:false — KratosJs installs its own JSON parser (50mb).
	app = await NestFactory.create(AppModule, { bodyParser: false, logger: false });

	panel = Panel.make('admin')
		.adminClient(false)
		.orm(
			{ driver: SqliteDriver, dbName: ':memory:', entities: [Todo], allowGlobalContext: true },
			{ migrate: false, updateSchema: true },
		)
		.resources([TodoResource]);

	await mountKratos(app, panel);
	await app.listen(0);
	baseUrl = await app.getUrl();
});

afterAll(async () => {
	await app.close();
	await panel.getOrm().close(true);
});

describe('KratosJs panel mounted on NestJS (Express)', () => {
	it("leaves Nest's own routes intact ('/' → the Nest controller)", async () => {
		const res = await fetch(`${baseUrl}/`);
		expect(res.status).toBe(200);
		expect(await res.text()).toBe('nest-root');
	});

	it('serves the panel /meta through Nest', async () => {
		const res = await fetch(`${baseUrl}${basePath}/meta`);
		expect(res.status).toBe(200);
		const meta = await res.json();
		expect(meta.resources.some((r: any) => r.slug === 'todos')).toBe(true);
	});

	it('runs CRUD through the composed pipeline inside Nest', async () => {
		const create = await fetch(`${baseUrl}${basePath}/todos`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ title: 'Ship it', done: false }),
		});
		expect(create.status).toBe(201);

		const list = await fetch(`${baseUrl}${basePath}/todos/list`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ page: 1, perPage: 10 }),
		});
		expect(list.status).toBe(200);
		const rows = await list.json();
		expect(rows.data.some((row: any) => row.title === 'Ship it')).toBe(true);
	});

	it('404s unknown resources through the panel', async () => {
		const res = await fetch(`${baseUrl}${basePath}/nope/list`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({}),
		});
		expect(res.status).toBe(404);
	});
});
