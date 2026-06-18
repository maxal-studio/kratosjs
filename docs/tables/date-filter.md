---
title: Date Filter
---

# Date Filter (`DateFilter`)

The `DateFilter` provides a date range picker for filtering table data by date ranges (from/to).

```typescript
import { DateFilter } from '@maxal_studio/kratosjs';

DateFilter.make('createdAt').label('Created Date').placeholder('Select date range...').displayFormat('YYYY-MM-DD');
```

## Available Options

- `make(name: string)`: Creates a new `DateFilter` instance.
- `label(text: Resolvable<string>)`: Sets the filter label.
- `placeholder(text: string)`: Sets the placeholder text for the date picker.
- `displayFormat(format: string)`: Sets the display format for dates (e.g., `'YYYY-MM-DD'`, `'MM/DD/YYYY'`).

## Usage

Add the date filter to your table's filters array:

```typescript
import { TableBuilder, DateFilter } from '@maxal_studio/kratosjs';

TableBuilder.make()
	.columns([...])
	.filters([
		DateFilter.make('createdAt')
			.label('Created Date')
			.placeholder('Select date range...')
			.displayFormat('YYYY-MM-DD'),
		DateFilter.make('updatedAt')
			.label('Updated Date')
			.placeholder('All dates')
			.displayFormat('DD/MM/YYYY'),
	]);
```

## Complete Example

```typescript
TableBuilder.make()
	.columns([...])
	.filters([
		DateFilter.make('createdAt')
			.label('Created Date')
			.placeholder('Select date range...')
			.displayFormat('YYYY-MM-DD'),
		DateFilter.make('publishedAt')
			.label('Published Date')
			.placeholder('All dates')
			.displayFormat('MM/DD/YYYY'),
	]);
```
