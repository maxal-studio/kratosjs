# KratosJs

**Admin panels, forged in TypeScript.**

A powerful, opinionated framework for building Node.js backend admin panels with React frontends. Define resources, forms, and tables once — render them everywhere.

## What is KratosJs?

KratosJs lets you describe your data model once with a fluent TypeScript API. From that single description the framework produces:

- A fully functional **REST API** (list, create, read, update, delete, bulk actions)
- A **React admin panel** that renders forms and tables from the server-side schema — no hand-written CRUD screens
- **Server-side validation** using the same engine the frontend uses, so rules can never be bypassed via direct API calls

```ts
// One resource definition drives the API and the admin UI
export class UserResource extends Resource {
	static schema() {
		return this.make()
			.table(
				Table.make().columns([
					TextColumn.make('name').label('Name').searchable().sortable(),
					TextColumn.make('email').label('Email').searchable(),
				]),
			)
			.form(
				FormBuilder.make().schema([
					TextInput.make('name').label('Name').required(),
					TextInput.make('email').label('Email').required().email(),
					TextInput.make('password').label('Password').password().min(8),
				]),
			);
	}
}
```

## Features

| Feature                          | Description                                                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Fluent TypeScript API**        | Define resources, forms, and tables with a clean, chainable API. Full autocompletion and compile-time safety.     |
| **React Frontend**               | The `@maxal_studio/kratosjs-react` package renders backend-defined schemas dynamically.                           |
| **MikroORM Support**             | One adapter for MySQL, PostgreSQL, SQLite, MariaDB, and MongoDB. Swap databases without rewriting your resources. |
| **Authentication & Permissions** | Built-in email auth, OAuth, and granular access control. Protect resources and actions with declarative policies. |
| **Shared Validation Engine**     | Rules declared on fields run on both client and server with the same isomorphic engine — no drift, no bypass.     |
| **Plugin System**                | Extend with plugins that register entities, migrations, resources, pages, routes, and lifecycle hooks.            |
| **Media Management**             | Integrated file uploads with local and S3 storage backends. Attach media to any resource field.                   |

## Quick Start

Scaffold a full app in one command:

```bash
npx @maxal_studio/kratosjs-cli new
```

The wizard asks for a project name and database driver (MySQL, PostgreSQL, SQLite, MariaDB, or MongoDB), then generates a ready-to-run app:

```bash
cd my-app
cp .env.example .env   # set your database credentials
npm run dev
```

Open the printed URL and sign in with **admin@example.com** / **password** (seeded on first boot).

## Packages

| Package                        | Description                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `@maxal_studio/kratosjs`       | Core framework — resources, form builder, table builder, validation engine, ORM adapter, auth          |
| `@maxal_studio/kratosjs-react` | React rendering layer — `AdminPanel`, `FormRenderer`, `TableRenderer`, all field and column components |
| `@maxal_studio/kratosjs-cli`   | Project scaffolding CLI                                                                                |

## Documentation

📚 **[View Full Documentation](examples/docs/README.md)**

Run the docs site locally:

```bash
cd examples/docs
npm install
npm run dev
```

### Quick Links

- [Getting Started](examples/docs/getting-started.md)
- [Creating Resources](examples/docs/resources/overview.md)
- [Form Fields](examples/docs/forms/overview.md)
- [Table Columns](examples/docs/tables/overview.md)
- [Authentication](examples/docs/authentication/overview.md)
- [Pages](examples/docs/pages/overview.md)
- [Media](examples/docs/media/overview.md)
- [Plugin System](examples/docs/plugins/overview.md)
- [Creating Plugins](examples/docs/plugins/creating-plugins.md)

## License

ISC
