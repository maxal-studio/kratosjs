---
title: Select Column
---

# Select Column

The select column allows inline editing using a dropdown.

## Basic Usage

```typescript
import { SelectColumn } from '@maxal_studio/kratosjs';

SelectColumn.make('role').options({
	admin: 'Admin',
	user: 'User',
	guest: 'Guest',
});
```

## Options

Set the available options:

```typescript
SelectColumn.make('role').options({
	admin: 'Administrator',
	user: 'User',
	guest: 'Guest',
});
```

## Selectable Placeholder

Allow placeholder to be selectable (null value):

```typescript
SelectColumn.make('role').options({...}).selectablePlaceholder();
```

## Placeholder

Set placeholder text:

```typescript
SelectColumn.make('role').options({...}).placeholder('Select role...');
```

## Searchable

Make the column searchable:

```typescript
SelectColumn.make('role').searchable();
```

## Search Using

Search using multiple columns:

```typescript
SelectColumn.make('role').searchUsing(['role', 'type']);
```

## Before State Updated

Execute callback before state is updated:

```typescript
SelectColumn.make('role').beforeStateUpdated((newValue, record) => {
	console.log('Updating', record.id, 'to', newValue);
});
```

## After State Updated

Execute callback after state is updated:

```typescript
SelectColumn.make('role').afterStateUpdated((newValue, record) => {
	console.log('Updated', record.id, 'to', newValue);
});
```

## Label

```typescript
SelectColumn.make('role').label('Role');
```

## Sorting

```typescript
SelectColumn.make('role').sortable();
```

## Width

```typescript
SelectColumn.make('role').width(150);
```

## Alignment

```typescript
SelectColumn.make('role').alignment('left');
```

## Complete Example

```typescript
SelectColumn.make('role')
	.label('Role')
	.options({
		admin: 'Administrator',
		user: 'User',
		guest: 'Guest',
	})
	.placeholder('Select role...')
	.selectablePlaceholder()
	.afterStateUpdated((newValue, record) => {
		console.log('Updated', record.id, 'to', newValue);
	})
	.sortable();
```
