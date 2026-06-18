---
title: Checkbox Column
---

# Checkbox Column

The checkbox column allows inline editing of boolean values using a checkbox.

## Basic Usage

```typescript
import { CheckboxColumn } from '@maxal_studio/kratosjs';

CheckboxColumn.make('active');
```

## Before State Updated

Execute callback before state is updated:

```typescript
CheckboxColumn.make('active').beforeStateUpdated((newValue, record) => {
	console.log('Updating', record.id, 'to', newValue);
});
```

## After State Updated

Execute callback after state is updated:

```typescript
CheckboxColumn.make('active').afterStateUpdated((newValue, record) => {
	console.log('Updated', record.id, 'to', newValue);
});
```

## Label

```typescript
CheckboxColumn.make('active').label('Active');
```

## Sorting

```typescript
CheckboxColumn.make('active').sortable();
```

## Width

```typescript
CheckboxColumn.make('active').width(100);
```

## Alignment

```typescript
CheckboxColumn.make('active').alignment('center');
```

## Complete Example

```typescript
CheckboxColumn.make('active')
	.label('Active')
	.afterStateUpdated((newValue, record) => {
		console.log('Updated', record.id, 'to', newValue);
	})
	.sortable();
```
