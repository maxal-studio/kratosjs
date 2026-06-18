# Global Configuration

Plugins can globally configure **every** table, form, action, field, and column in a panel using `configureUsing`.

This is the mechanism a plugin uses to, for example, add an export button to every table, force destructive actions to require confirmation, or add a "Created at" column everywhere — without touching individual resources.

## How it works

Each builder family exposes a static `configureUsing(callback)`:

| Builder        | Static method                     | Callback receives              |
| -------------- | --------------------------------- | ------------------------------ |
| `TableBuilder` | `TableBuilder.configureUsing(cb)` | the table builder              |
| `FormBuilder`  | `FormBuilder.configureUsing(cb)`  | the form builder               |
| `Action`       | `Action.configureUsing(cb)`       | each action (and bulk action)  |
| `Field`        | `Field.configureUsing(cb)`        | each field (all field types)   |
| `Column`       | `Column.configureUsing(cb)`       | each column (all column types) |

Callbacks are registered once (typically in a plugin's `register()`), then applied to a resource's builders **after the resource has defined them and before serialization**. Because they run last, a callback sees the resource's fully-built schema and can _inject into_ collections (columns, actions) or override per-resource settings — exactly what "apply X to every resource" needs.

> Callbacks are global and stack in registration order. They run on every request (schemas are built per request), so keep them cheap and side-effect free.

## Examples

### Add a header action to every table

```ts
import { Plugin, Panel, TableBuilder, Action } from '@maxal_studio/kratosjs';

export class ExportButtonPlugin extends Plugin {
	getName() {
		return 'export-button';
	}

	register(panel: Panel) {
		TableBuilder.configureUsing(table => {
			table.headerActions([
				...table.getHeaderActions(),
				Action.make('exportCsv').label('Export').icon('Download').exportsTo('csv'),
			]);
		});
	}
}
```

`headerActions()` renders buttons in the table toolbar (above the rows). See [Tables → Header actions](/tables/overview#header-actions).

### Enforce confirmation on destructive actions

```ts
Action.configureUsing(action => {
	if (action.getColor() === 'danger') {
		action.requiresConfirmation();
	}
});
```

### Make every email field required

```ts
Field.configureUsing(field => {
	if (field.getName() === 'email') {
		field.required();
	}
});
```

### Make a column sortable everywhere

```ts
Column.configureUsing(column => {
	if (column.getName() === 'createdAt') {
		column.sortable();
	}
});
```

## Opting out per resource

Builders can expose flags a global callback checks before acting. For example, tables have `exportable()`:

```ts
// In a resource
static table() {
	return TableBuilder.make()
		.columns([/* ... */])
		.exportable(false); // opt this table out of export plugins
}
```

```ts
// In the plugin's configureUsing callback
TableBuilder.configureUsing(table => {
	if (!table.isExportable()) return;
	// ...add the export action
});
```

## Testing

`configureUsing` callbacks are global. In tests, reset them between cases:

```ts
import { TableBuilder, Action } from '@maxal_studio/kratosjs';

afterEach(() => {
	TableBuilder.clearConfigurations();
	Action.clearConfigurations();
});
```
