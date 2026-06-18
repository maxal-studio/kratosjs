---
title: Toggle Column
---

# Toggle Column

The toggle column allows inline editing of boolean values using a switch.

## Basic Usage

```typescript
import { ToggleColumn } from '@maxal_studio/kratosjs';

ToggleColumn.make('active');
```

## Icons

Set icons for on and off states:

```typescript
ToggleColumn.make('active').onIcon('Check').offIcon('X');
```

## Colors

Set colors for on and off states:

```typescript
ToggleColumn.make('active').onColor('bg-green-600').offColor('bg-gray-400');
```

## Before State Updated

Execute callback before state is updated:

```typescript
ToggleColumn.make('active').beforeStateUpdated((newValue, record) => {
	console.log('Updating', record.id, 'to', newValue);
});
```

## After State Updated

Execute callback after state is updated:

```typescript
ToggleColumn.make('active').afterStateUpdated((newValue, record) => {
	console.log('Updated', record.id, 'to', newValue);
});
```

## Label

```typescript
ToggleColumn.make('active').label('Active');
```

## Sorting

```typescript
ToggleColumn.make('active').sortable();
```

## Width

```typescript
ToggleColumn.make('active').width(100);
```

## Alignment

```typescript
ToggleColumn.make('active').alignment('center');
```

## Complete Example

```typescript
ToggleColumn.make('active')
	.label('Active')
	.onIcon('Check')
	.offIcon('X')
	.onColor('text-green-600')
	.offColor('text-gray-400')
	.afterStateUpdated((newValue, record) => {
		console.log('Updated', record.id, 'to', newValue);
	})
	.sortable();
```
