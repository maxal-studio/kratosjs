---
title: Text Input Column
---

# Text Input Column

The text input column allows inline editing using a text input.

## Basic Usage

```typescript
import { TextInputColumn } from '@maxal_studio/kratosjs';

TextInputColumn.make('name');
```

## Input Type

Set the input type:

```typescript
TextInputColumn.make('email').type('email');
```

Available types: `text`, `email`, `number`, `tel`, `url`, `password`, etc.

## Rules

Set validation rules:

```typescript
TextInputColumn.make('email').type('email').rules(['required', 'email']);
```

## Placeholder

Set placeholder text:

```typescript
TextInputColumn.make('name').placeholder('Enter name...');
```

## Searchable

Make the column searchable:

```typescript
TextInputColumn.make('name').searchable();
```

## Search Using

Search using multiple columns:

```typescript
TextInputColumn.make('name').searchUsing(['name', 'surname']);
```

## Before State Updated

Execute callback before state is updated:

```typescript
TextInputColumn.make('name').beforeStateUpdated((newValue, record) => {
	console.log('Updating', record.id, 'to', newValue);
});
```

## After State Updated

Execute callback after state is updated:

```typescript
TextInputColumn.make('name').afterStateUpdated((newValue, record) => {
	console.log('Updated', record.id, 'to', newValue);
});
```

## Label

```typescript
TextInputColumn.make('name').label('Name');
```

## Sorting

```typescript
TextInputColumn.make('name').sortable();
```

## Width

```typescript
TextInputColumn.make('name').width(200);
```

## Alignment

```typescript
TextInputColumn.make('name').alignment('left');
```

## Complete Example

```typescript
TextInputColumn.make('name')
	.label('Name')
	.type('text')
	.placeholder('Enter name...')
	.rules(['required'])
	.afterStateUpdated((newValue, record) => {
		console.log('Updated', record.id, 'to', newValue);
	})
	.sortable()
	.searchable();
```
