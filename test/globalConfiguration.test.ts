import { afterEach, describe, expect, it } from 'vitest';
import { TableBuilder, Action, BulkAction, TextColumn } from '../src';

afterEach(() => {
	TableBuilder.clearConfigurations();
	Action.clearConfigurations();
});

describe('TableBuilder header actions & exportable', () => {
	it('serializes header actions', () => {
		const json = TableBuilder.make()
			.columns([TextColumn.make('name')])
			.headerActions([Action.make('exportCsv').label('Export').icon('Download').exportsTo('csv')])
			.toJSON();

		expect(json.headerActions).toHaveLength(1);
		expect(json.headerActions![0]).toMatchObject({ name: 'exportCsv', label: 'Export', export: 'csv' });
	});

	it('omits headerActions when none are set', () => {
		const json = TableBuilder.make()
			.columns([TextColumn.make('name')])
			.toJSON();
		expect(json.headerActions).toBeUndefined();
	});

	it('defaults to exportable and respects opt-out', () => {
		expect(TableBuilder.make().isExportable()).toBe(true);
		expect(TableBuilder.make().exportable(false).isExportable()).toBe(false);
	});
});

describe('Action.exportsTo', () => {
	it('serializes the export format', () => {
		expect(Action.make('x').exportsTo('csv').toJSON().export).toBe('csv');
	});

	it('does not add export field by default', () => {
		expect(Action.make('x').toJSON().export).toBeUndefined();
	});
});

describe('configureUsing', () => {
	it('applies table configuration callbacks in registration order', () => {
		const order: number[] = [];
		TableBuilder.configureUsing(() => order.push(1));
		TableBuilder.configureUsing(() => order.push(2));

		const table = TableBuilder.make();
		TableBuilder.applyConfiguration(table);

		expect(order).toEqual([1, 2]);
	});

	it('lets a callback inject a header action into every table', () => {
		TableBuilder.configureUsing(table =>
			table.headerActions([
				...table.getHeaderActions(),
				Action.make('exportCsv').label('Export').exportsTo('csv'),
			]),
		);

		const table = TableBuilder.make().columns([TextColumn.make('name')]);
		TableBuilder.applyConfiguration(table);

		expect(table.getHeaderActions().map(a => a.getName())).toContain('exportCsv');
	});

	it('clear() removes registered callbacks', () => {
		let calls = 0;
		TableBuilder.configureUsing(() => calls++);
		TableBuilder.clearConfigurations();

		TableBuilder.applyConfiguration(TableBuilder.make());
		expect(calls).toBe(0);
	});

	it('Action.configureUsing applies to bulk actions too', () => {
		Action.configureUsing(action => {
			if (action.getColor() === 'danger') action.requiresConfirmation();
		});

		const bulk = BulkAction.make('destroy').color('danger');
		Action.applyConfiguration(bulk);

		expect(bulk.getRequiresConfirmation()).toBe(true);
	});
});
