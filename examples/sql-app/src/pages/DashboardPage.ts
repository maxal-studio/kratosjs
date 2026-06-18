import { Page } from '@maxal_studio/kratosjs';
import { CalloutBlock } from '../blocks/CalloutBlock';

/**
 * Custom page that hosts the app-level CalloutBlock (no plugin). The React
 * renderer for the 'callout' block type is registered in src/admin/main.tsx.
 */
export class DashboardPage extends Page {
	static slug = 'dashboard';
	static label = 'Dashboard';
	static icon = 'LayoutDashboard';
	static navigationGroup = 'App';
	static navigationSort = -1;

	static async blocks() {
		return [
			CalloutBlock.make()
				.title('Welcome to KratosJs 👋')
				.message(
					'KratosJs is a powerful, opinionated framework for building Node.js admin panels with React frontends. Define your resources, forms, and tables once in TypeScript — and they render everywhere, automatically. This entire dashboard (including these callouts) is built with it.',
				)
				.tone('info')
				.columns(12),
			CalloutBlock.make()
				.title('Fluent TypeScript API')
				.message(
					'Define resources, forms, and tables with a clean, chainable API. Full autocompletion and compile-time safety out of the box — no hand-written CRUD screens.',
				)
				.tone('success')
				.columns(6),
			CalloutBlock.make()
				.title('One ORM, Every Database')
				.message(
					'Powered by MikroORM: one adapter for MySQL, PostgreSQL, SQLite, MariaDB, and MongoDB. Swap databases without rewriting your resources.',
				)
				.tone('success')
				.columns(6),
			CalloutBlock.make()
				.title('Auth & Permissions, Built In')
				.message(
					'Email auth, OAuth, and granular access control come standard. Protect resources and actions with declarative policies.',
				)
				.tone('warning')
				.columns(6),
			CalloutBlock.make()
				.title('Extend with Plugins & Custom Components')
				.message(
					'Add plugins that register entities, migrations, resources, pages, and hooks — or register custom fields, columns, widgets, and blocks (like this one) directly on mountAdminPanel(), no plugin required.',
				)
				.tone('warning')
				.columns(6),
		];
	}
}
