# Grouped Tables with Metrics

KratosJs tables support grouping and aggregation, allowing you to display summarized data instead of individual records. This is perfect for dashboards, analytics views, and any scenario where you want to show totals, averages, or other computed metrics per group.

## Overview

Grouped tables transform raw records into aggregated rows by:

- **Grouping** records by one or more fields
- **Computing metrics** (counts, sums, averages, ratios) for each group
- **Displaying** one row per group with the computed values

## Basic Usage

Use the `.grouping()` method to configure grouping and metrics:

```typescript
import { TableBuilder, TextColumn } from '@maxal_studio/kratosjs';

static table() {
  return TableBuilder.make()
    .grouping({
      by: ['userId'],
      metrics: [
        { name: 'totalOrders', op: 'count' },
        { name: 'totalRevenue', op: 'sum', field: 'amount' },
        { name: 'avgOrderValue', op: 'avg', field: 'amount' },
      ],
    })
    .columns([
      TextColumn.make('userId').label('Customer'),
      TextColumn.make('totalOrders').label('Total Orders'),
      TextColumn.make('totalRevenue').label('Revenue').money('USD'),
      TextColumn.make('avgOrderValue').label('Avg Order Value').money('USD'),
    ]);
}
```

## Metric Operations

### count

Counts the number of records in each group.

```typescript
// Count all records
{ name: 'totalRecords', op: 'count' }

// Count non-null values in a specific field
{ name: 'totalOpened', op: 'count', field: 'openedAt', notNull: true }
```

### sum

Sums numeric values across the group.

```typescript
{ name: 'totalRevenue', op: 'sum', field: 'amount' }
```

### avg

Computes the average of numeric values.

```typescript
{ name: 'avgRating', op: 'avg', field: 'rating' }
```

### min / max

Finds the minimum or maximum value in the group.

```typescript
{ name: 'lowestPrice', op: 'min', field: 'price' }
{ name: 'highestPrice', op: 'max', field: 'price' }
{ name: 'earliestDate', op: 'min', field: 'createdAt' }
{ name: 'latestDate', op: 'max', field: 'createdAt' }
```

### first

Gets the first value in the group (useful for getting the first record's data).

```typescript
{ name: 'firstOrderDate', op: 'first', field: 'createdAt' }
{ name: 'firstOrderId', op: 'first', field: '_id' }
```

**Note:** "First" depends on document order. Use with sorting in your base query or combine with `min`/`max` for deterministic results.

### last

Gets the last value in the group (useful for getting the most recent record's data).

```typescript
{ name: 'lastOrderDate', op: 'last', field: 'createdAt' }
{ name: 'lastStatus', op: 'last', field: 'status' }
```

**Note:** "Last" depends on document order. Use with sorting in your base query or combine with `min`/`max` for deterministic results.

### countDistinct

Counts the number of unique values in a field.

```typescript
// Count unique products ordered per customer
{ name: 'uniqueProducts', op: 'countDistinct', field: 'productId' }

// Count unique days customer placed orders
{ name: 'activeDays', op: 'countDistinct', field: 'orderDate' }
```

### ratio

Computes a ratio between two other metrics (useful for percentages and rates).

```typescript
{
  name: 'conversionRate',
  op: 'ratio',
  numerator: 'totalConverted',    // Must be defined in metrics array
  denominator: 'totalVisitors',   // Must be defined in metrics array
  precision: 2                     // Decimal places (default: 2)
}
```

**Important:** Ratio metrics reference other metrics by name. Define the numerator and denominator metrics first:

```typescript
.grouping({
  by: ['campaignId'],
  metrics: [
    { name: 'totalSent', op: 'count' },
    { name: 'totalOpened', op: 'count', field: 'openedAt', notNull: true },
    { name: 'openRate', op: 'ratio', numerator: 'totalOpened', denominator: 'totalSent' },
  ],
})
```

## Grouping by Multiple Fields

Group by multiple fields to create hierarchical aggregations:

```typescript
.grouping({
  by: ['region', 'status'],
  metrics: [
    { name: 'count', op: 'count' },
    { name: 'totalAmount', op: 'sum', field: 'amount' },
  ],
})
.columns([
  TextColumn.make('region').label('Region'),
  TextColumn.make('status').label('Status'),
  TextColumn.make('count').label('Count'),
  TextColumn.make('totalAmount').label('Total').money('USD'),
])
```

## Alternative Syntax

You can also use the convenience methods `.groupBy()` and `.metrics()`:

```typescript
.groupBy(['userId'])
.metrics([
  { name: 'totalOrders', op: 'count' },
  { name: 'totalRevenue', op: 'sum', field: 'amount' },
])
```

Both approaches are equivalent; use whichever feels more natural.

## Complete Example: Notification Analytics

Here's a real-world example showing user notification statistics:

```typescript
export class NotificationStatsResource extends BaseResource {
	static slug = 'notification-stats';
	static entity = Notification;
	static label = 'Notification Analytics';

	static table() {
		return TableBuilder.make()
			.populate([{ path: 'userId', select: 'name email' }])
			.grouping({
				by: ['userId'],
				metrics: [
					{ name: 'totalSent', op: 'count' },
					{ name: 'totalOpened', op: 'count', field: 'openedAt', notNull: true },
					{
						name: 'openedRatio',
						op: 'ratio',
						numerator: 'totalOpened',
						denominator: 'totalSent',
						precision: 2,
					},
				],
			})
			.columns([
				TextColumn.make('userId')
					.label('User')
					.formatStateUsing(async (_value, row) => {
						// userId is populated when defined in .populate()
						return row.userId?.name ?? row.userId;
					})
					.deeplink({ resource: 'users', id: (_value, row) => row.userId }),
				TextColumn.make('totalSent').label('Total Sent'),
				TextColumn.make('totalOpened').label('Total Opened'),
				TextColumn.make('openedRatio')
					.label('Open Rate')
					.formatStateUsing(async (_value, row) => {
						const ratio = row.openedRatio || 0;
						return `${(ratio * 100).toFixed(1)}%`;
					})
					.badge()
					.colors((_value, row) => {
						const ratio = row.openedRatio || 0;
						if (ratio >= 0.7) return 'success';
						if (ratio >= 0.4) return 'warning';
						return 'danger';
					}),
			])
			.paginate(10)
			.defaultSort('totalSent', 'desc');
	}
}
```

## Working with Populate (Relations)

When grouping by a relation field (like `userId`), you can use `.populate()` to automatically fetch related data:

```typescript
.populate([{ path: 'userId', select: 'name email profileImage' }])
.grouping({
  by: ['userId'],
  metrics: [
    { name: 'totalOrders', op: 'count' },
  ],
})
.columns([
  TextColumn.make('userId')
    .label('Customer')
    .formatStateUsing(async (_value, row) => {
      // row.userId is now a populated object: { _id, name, email, profileImage }
      return row.userId.name;
    })
    .deeplink({
      resource: 'users',
      id: (_value, row) => row.userId._id,
    }),
  TextColumn.make('totalOrders').label('Total Orders'),
])
```

**Important Notes:**

- Populate only works for fields that are **in the `groupBy` array**
- The populated field becomes an object (not just an ID) in your results
- Use `row.fieldName._id` to access the ID of the populated document
- You can select specific fields with the `select` parameter to optimize performance

## Working with Filters and Tabs

Filters and tabs work seamlessly with grouped tables. **Important:** They filter the **raw records before grouping**, not the aggregated results.

```typescript
// Example: Group notifications by user, but only show unread ones
.grouping({
  by: ['userId'],
  metrics: [
    { name: 'totalUnread', op: 'count' },
    { name: 'firstNotification', op: 'first', field: 'createdAt' }
  ]
})
.tabs([
  {
    key: 'all',
    label: 'All',
    queryBuilder: [],
  },
  {
    key: 'unread',
    label: 'Unread Only',
    queryBuilder: [equalsRule('openedAt', null, 'date')],  // ✅ Use raw field name
  },
  {
    key: 'read',
    label: 'Read Only',
    queryBuilder: [isNotNullRule('openedAt')],  // ✅ Use raw field name
  },
])
.filters([
  DateFilter.make('createdAt').label('Created Date'),  // ✅ Filter on raw fields
  SelectFilter.make('status').options({ pending: 'Pending', sent: 'Sent' }),
])
```

### Key Points

- ✅ **Use raw field names** in tabs and filters (e.g., `openedAt`, `status`)
- ❌ **Don't use aggregated metric names** (e.g., `totalUnread`, `openedRatio`)
- The flow is: **Filter → Group → Display**

### Example: Customer Analytics with Active Filter

```typescript
.grouping({
  by: ['customerId'],
  metrics: [
    { name: 'totalOrders', op: 'count' },
    { name: 'totalSpent', op: 'sum', field: 'amount' }
  ]
})
.tabs([
  {
    key: 'all',
    label: 'All Customers',
  },
  {
    key: 'big_spenders',
    label: 'Big Spenders',
    // Filter raw orders where amount > 1000 BEFORE grouping
    queryBuilder: [greaterThanRule('amount', 1000, 'number')],
  },
])
```

In this example, the "Big Spenders" tab filters to orders over $1000, then groups by customer to show their totals.

## Sorting

When using grouped tables, sorting works on the group fields and computed metrics:

```typescript
.defaultSort('totalRevenue', 'desc')  // Sort by metric
.defaultSort('userId', 'asc')         // Sort by group key
```

## Pagination

Pagination counts **groups**, not individual records:

```typescript
.paginate(20)  // Show 20 groups per page
```

## Important Considerations

1. **Column References**: Columns must reference either:
    - Group-by fields (e.g., `userId`)
    - Metric names (e.g., `totalSent`, `openedRatio`)

    You cannot reference raw record fields that aren't part of the grouping.

2. **Populate with Grouping**: When grouping by relation fields, use `.populate()` and the adapter will automatically use `$lookup` to join related data:

    ```typescript
    .populate([{ path: 'userId', select: 'name email', model: User }])
    .grouping({ by: ['userId'], metrics: [...] })
    .columns([
    	TextColumn.make('userId').formatStateUsing(async (_value, row) => {
    		// row.userId is now populated: { _id, name, email }
    		return row.userId.name;
    	})
    ])
    ```

    **Note**: Populate only works for fields in the `groupBy` array. Other relation fields will not be populated in grouped queries.

3. **Actions**: Row actions work on group rows, not individual records. Consider whether edit/delete actions make sense for grouped views.

4. **Database Support**: Grouping works with both MongoDB and SQL databases via the MikroORM adapter.

## Performance Tips

- **Index group-by fields** in your database for faster aggregation
- **Limit metrics** to only what you need to display
- **Use appropriate page sizes** - grouped data is usually much smaller than raw records

## Summary of All Metrics

| Metric          | Purpose              | Parameters                               | Example Use Case                  |
| --------------- | -------------------- | ---------------------------------------- | --------------------------------- |
| `count`         | Count records        | `field?`, `notNull?`                     | Total orders per customer         |
| `sum`           | Sum numeric values   | `field`                                  | Total revenue per region \*\*\*\* |
| `avg`           | Average of values    | `field`                                  | Average order value               |
| `min`           | Minimum value        | `field`                                  | Lowest price, earliest date       |
| `max`           | Maximum value        | `field`                                  | Highest price, latest date        |
| `first`         | First value in group | `field`                                  | First order date                  |
| `last`          | Last value in group  | `field`                                  | Most recent status                |
| `countDistinct` | Count unique values  | `field`                                  | Unique products ordered           |
| `ratio`         | Ratio of two metrics | `numerator`, `denominator`, `precision?` | Conversion rate, open rate        |

## TypeScript Types

All grouping types are fully typed:

```typescript
import type {
	GroupingConfig,
	MetricDefinition,
	CountMetric,
	SumMetric,
	AvgMetric,
	MinMetric,
	MaxMetric,
	FirstMetric,
	LastMetric,
	CountDistinctMetric,
	RatioMetric,
} from '@maxal_studio/kratosjs';
```

## See Also

- [Filters](./filters.md) - Filter data before grouping
