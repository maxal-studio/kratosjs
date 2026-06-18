---
title: Icon Column
---

# Icon Column

The icon column displays Lucide icons in a table.

## Basic Usage

```typescript
import { IconColumn } from '@maxal_studio/kratosjs';

IconColumn.make('status');
```

## Static Icon

Display a static icon:

```typescript
IconColumn.make('status').icon('Check');
```

## Icon Mapping

Map values to different icons:

```typescript
IconColumn.make('status').icon({
	draft: 'Edit',
	published: 'CheckCircle',
	archived: 'Archive',
});
```

## Icon Function

Use a function to determine the icon:

```typescript
IconColumn.make('status').icon((value, row) => {
	return value === 'active' ? 'Check' : 'X';
});
```

## Icon Color

Set the icon color:

```typescript
IconColumn.make('status').iconColor('text-green-600');
```

## Color Mapping

Map values to different colors:

```typescript
IconColumn.make('status').iconColor({
	draft: 'text-gray-600',
	published: 'text-green-600',
	archived: 'text-red-600',
});
```

## Color Function

Use a function to determine the color:

```typescript
IconColumn.make('status').iconColor((value, row) => {
	return value === 'active' ? 'text-green-600' : 'text-red-600';
});
```

## Boolean Icon

Display icon based on boolean value:

```typescript
IconColumn.make('verified').boolean().trueIcon('Check').falseIcon('X');
```

## Size

Set the icon size:

```typescript
IconColumn.make('status').size('lg');
```

## List with Line Breaks

Display list with line breaks:

```typescript
IconColumn.make('tags').listWithLineBreaks();
```

## Label

```typescript
IconColumn.make('status').label('Status');
```

## Sorting

```typescript
IconColumn.make('status').sortable();
```

## Complete Example

```typescript
IconColumn.make('status')
	.label('Status')
	.icon({
		draft: 'Edit',
		published: 'CheckCircle',
		archived: 'Archive',
	})
	.iconColor({
		draft: 'text-gray-600',
		published: 'text-green-600',
		archived: 'text-red-600',
	})
	.size('lg')
	.sortable();
```
