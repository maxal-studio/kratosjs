---
title: Repeater
---

# Repeater

The repeater field allows you to create repeating groups of fields.

## Basic Usage

```typescript
import { Repeater, TextInput } from '@maxal_studio/kratosjs';

Repeater.make('items').schema([
	TextInput.make('name').label('Name').required(),
	TextInput.make('quantity').label('Quantity').numeric().required(),
]);
```

## Schema

Define the fields for each repeater item:

```typescript
Repeater.make('addresses').schema([
	TextInput.make('street').label('Street').required(),
	TextInput.make('city').label('City').required(),
	TextInput.make('zip').label('ZIP').required(),
]);
```

## Default Items

Set the default number of items:

```typescript
Repeater.make('items').schema([...]).defaultItems(3);
```

## Min Items

Set the minimum number of items:

```typescript
Repeater.make('items').schema([...]).minItems(1);
```

## Max Items

Set the maximum number of items:

```typescript
Repeater.make('items').schema([...]).maxItems(10);
```

## Addable

Control if items can be added:

```typescript
Repeater.make('items').schema([...]).addable(false);
```

## Deletable

Control if items can be deleted:

```typescript
Repeater.make('items').schema([...]).deletable(false);
```

## Reorderable

Control if items can be reordered:

```typescript
Repeater.make('items').schema([...]).reorderable(false);
```

## Item Label

Set a custom label for each item:

```typescript
Repeater.make('items').schema([...]).itemLabel('Item {{ index }}');
```

## Collapsible

Make items collapsible:

```typescript
Repeater.make('items').schema([...]).collapsible();
```

## Label

```typescript
Repeater.make('items').label('Items');
```

## Default Value

```typescript
Repeater.make('items').default([
	{ name: 'Item 1', quantity: 1 },
	{ name: 'Item 2', quantity: 2 },
]);
```

## Required

```typescript
Repeater.make('items').required();
```

## Helper Text

```typescript
Repeater.make('items').helperText('Add multiple items');
```

## Hints

```typescript
Repeater.make('items').hint('Add items to the list').hintIcon('Plus');
```

## Complete Example

```typescript
Repeater.make('addresses')
	.label('Addresses')
	.schema([
		TextInput.make('street').label('Street').required(),
		TextInput.make('city').label('City').required(),
		TextInput.make('zip').label('ZIP').required(),
	])
	.defaultItems(1)
	.minItems(1)
	.maxItems(5)
	.addable(true)
	.deletable(true)
	.reorderable(true)
	.collapsible()
	.itemLabel('Address {{ index + 1 }}')
	.hint('Add multiple addresses')
	.hintIcon('MapPin');
```
