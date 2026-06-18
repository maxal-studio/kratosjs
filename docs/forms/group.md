---
title: Group
---

# Group

The group component groups multiple fields together, optionally with a label and description.

## Basic Usage

```typescript
import { Group, TextInput } from '@maxal_studio/kratosjs';

Group.make([TextInput.make('firstName').label('First Name'), TextInput.make('lastName').label('Last Name')]);
```

## Schema

Define the fields in the group:

```typescript
Group.make([
	TextInput.make('street').label('Street'),
	TextInput.make('city').label('City'),
	TextInput.make('zip').label('ZIP'),
]);
```

## Columns

Set the number of columns in the group's grid:

```typescript
Group.make([...]).columns(2);
```

## Responsive Columns

Set different column counts for different breakpoints:

```typescript
Group.make([...]).columns({ default: 1, md: 2, lg: 3 });
```

## Description

Add a description:

```typescript
Group.make([...]).description('Enter address information');
```

## Column Span

Control how many columns the group spans:

```typescript
Group.make([...]).columnSpan(2);
```

## Column Span Full

Make the group span full width:

```typescript
Group.make([...]).columnSpanFull();
```

## Column Start

Set which column to start at:

```typescript
Group.make([...]).columnStart(2);
```

## Complete Example

```typescript
Group.make([
	TextInput.make('firstName').label('First Name').required(),
	TextInput.make('lastName').label('Last Name').required(),
	TextInput.make('email').label('Email').email().required(),
])
	.columns(2)
	.description('Enter personal information')
	.columnSpanFull();
```
