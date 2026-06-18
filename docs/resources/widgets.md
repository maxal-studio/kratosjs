---
title: Widgets
---

# Widgets

Widgets are components that display aggregated data, typically used on dashboards. KratosJs provides two types of widgets: StatsWidget and ChartWidget.

## StatsWidget

StatsWidget displays a single numeric value with optional formatting.

### Basic Usage

```typescript
import { StatsWidget } from '@maxal_studio/kratosjs';

StatsWidget.make('totalUsers')
	.label('Total Users')
	.icon('Users')
	.render(async (em, entity) => em.count(entity, {}));
```

### Format

Set the display format:

```typescript
StatsWidget.make('totalCoins').label('Total Coins').format('currency').currency('EUR');
```

Available formats: `'number'`, `'currency'`, `'percentage'`

### Currency

Format as currency:

```typescript
StatsWidget.make('totalCoins').label('Total Coins').currency('EUR'); // Automatically sets format to 'currency'
```

### Precision

Set decimal precision:

```typescript
StatsWidget.make('averagePrice').label('Average Price').currency('USD').precision(2);
```

### Suffix

Add a suffix to the value:

```typescript
StatsWidget.make('activeUsers').label('Active Users').suffix('users');
```

### Prefix

Add a prefix to the value:

```typescript
StatsWidget.make('revenue').label('Revenue').prefix('$');
```

### Render Function

The render function receives `(em, entity)` where `em` is the MikroORM `EntityManager` and `entity` is the resource's entity schema:

```typescript
StatsWidget.make('totalUsers').render(async (em, entity) => em.count(entity, {}));
```

### Using List Filters in Widgets

Widgets can respect the current list view's filters (search, column filters, query builder) by accessing the database adapter from the request context:

```typescript
import { StatsWidget, getRequestContext } from '@maxal_studio/kratosjs';

StatsWidget.make('activeUsers')
	.label('Active Users')
	.suffix('users')
	.render(async (em, entity) => {
		const ctx = getRequestContext();
		const filter =
			ctx?.databaseAdapter && ctx.listParams ? await ctx.databaseAdapter.buildFiltersQuery(ctx.listParams) : {};
		return em.count(entity, { ...filter, active: true });
	});
```

**Available context properties:**

- **databaseAdapter**: The adapter instance with methods to build database-specific queries
- **listParams**: Normalized QueryParams (filters, search, sort, queryBuilders, etc.)

**Adapter methods:**

- **buildFiltersQuery(params)**: Returns adapter-specific filter/query object ready for MikroORM

### Aggregation Example (MongoDB)

For complex aggregations, use the native driver via the EntityManager connection:

```typescript
StatsWidget.make('totalCoins')
	.label('Total Coins')
	.icon('Coins')
	.format('currency')
	.currency('EUR')
	.render(async (em, entity) => {
		const conn = em.getConnection();
		const result = await conn.aggregate(entity.name, [{ $group: { _id: null, total: { $sum: '$coins' } } }]);
		return result.length > 0 ? result[0].total : 0;
	});
```

## ChartWidget

ChartWidget displays chart data as line, bar, or pie charts.

### Basic Usage

```typescript
import { ChartWidget } from '@maxal_studio/kratosjs';

ChartWidget.make('userRegistrations')
	.label('User Registrations')
	.icon('UserPlus')
	.type('bar')
	.render(async () => {
		// Return array of { label: string, value: number }
		return [
			{ label: 'Week 1', value: 10 },
			{ label: 'Week 2', value: 15 },
			{ label: 'Week 3', value: 20 },
		];
	});
```

### Chart Types

Set the chart type:

```typescript
ChartWidget.make('userRegistrations').type('line'); // or 'bar', 'pie'
```

### Show Legend

Display the chart legend:

```typescript
ChartWidget.make('userRegistrations').showLegend();
```

### Render Function

The render function receives `(em, entity)` and returns an array of data points or null:

```typescript
ChartWidget.make('userRegistrations').render(async (em, entity) => {
	const conn = em.getConnection();
	const results = await conn.aggregate(entity.name, [
		{
			$group: {
				_id: { $dateToString: { format: '%Y-W%V', date: '$createdAt' } },
				value: { $sum: 1 },
			},
		},
		{ $sort: { _id: 1 } },
	]);

	return results.map(item => ({
		label: item._id,
		value: item.value,
	}));
});
```

### Data Point Format

Each data point should have:

```typescript
{
	label: string; // Display label (e.g., 'Week 1', 'January', 'Admin')
	value: number; // Numeric value
}
```

### Complete Examples

#### StatsWidget Example

```typescript
StatsWidget.make('activeUsers')
	.label('Active Users')
	.icon('Users')
	.suffix('users')
	.render(async (em, entity) => em.count(entity, { active: true }));
```

#### ChartWidget - Bar Chart

```typescript
ChartWidget.make('userRegistrations')
	.label('User Registrations')
	.icon('UserPlus')
	.type('bar')
	.render(async (em, entity) => {
		const twelveWeeksAgo = new Date();
		twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 12 * 7);

		const conn = em.getConnection();
		const results = await conn.aggregate(entity.name, [
			{ $match: { createdAt: { $gte: twelveWeeksAgo } } },
			{
				$group: {
					_id: { $dateToString: { format: '%Y-W%V', date: '$createdAt' } },
					value: { $sum: 1 },
				},
			},
			{ $sort: { _id: 1 } },
			{ $limit: 12 },
		]);

		return results.map(item => ({
			label: item._id,
			value: item.value,
		}));
	});
```

#### ChartWidget - Pie Chart

```typescript
ChartWidget.make('usersByRole')
	.label('Users by Role')
	.icon('Users')
	.type('pie')
	.showLegend()
	.render(async (em, entity) => {
		const conn = em.getConnection();
		const results = await conn.aggregate(entity.name, [
			{ $group: { _id: '$role', value: { $sum: 1 } } },
			{ $sort: { value: -1 } },
		]);

		return results.map(item => ({
			label: item._id || 'Unknown',
			value: item.value,
		}));
	});
```

## Using Widgets in Resources

Define widgets in the resource's `widgets()` method:

```typescript
static widgets() {
	return [
		StatsWidget.make('activeUsers')
			.label('Active Users')
			.icon('Users')
			.render(async (em, entity) => em.count(entity, { active: true })),
		ChartWidget.make('userRegistrations')
			.label('User Registrations')
			.type('bar')
			.render(async (em, entity) => {
				// Return chart data using em and entity
			}),
	];
}
```

## Using Widgets in Pages

Widgets can be displayed on custom pages using `WidgetBlock`:

```typescript
import { WidgetBlock } from '@maxal_studio/kratosjs';

static async blocks() {
	const userWidgets = UserResource.widgets();
	const blocks = [];

	if (userWidgets) {
		userWidgets.forEach(widget => {
			blocks.push(WidgetBlock.make(widget).columns(3));
		});
	}

	return blocks;
}
```
