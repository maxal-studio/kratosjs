---
title: Textarea
---

# Textarea

The textarea field allows you to interact with multi-line text.

## Basic Usage

```typescript
import { Textarea } from '@maxal_studio/kratosjs';

Textarea.make('description');
```

## Rows and Columns

Set the number of rows and columns:

```typescript
Textarea.make('description').rows(5).cols(50);
```

## Autosize

Make the textarea automatically resize based on content:

```typescript
Textarea.make('description').autosize();
```

## Length Validation

```typescript
Textarea.make('description').minLength(10).maxLength(1000);
```

## Placeholder

```typescript
Textarea.make('description').placeholder('Enter description...');
```

## Read-Only

```typescript
Textarea.make('description').readOnly();
```

## Default Value

```typescript
Textarea.make('description').default('Default text');
```

## Required

```typescript
Textarea.make('description').required();
```

## Helper Text

```typescript
Textarea.make('description').helperText('Enter a detailed description');
```

## Hints

```typescript
Textarea.make('description').hint('Must be at least 10 characters').hintIcon('Info');
```

## Complete Example

```typescript
Textarea.make('description')
	.label('Description')
	.rows(5)
	.cols(50)
	.autosize()
	.minLength(10)
	.maxLength(1000)
	.placeholder('Enter description...')
	.required()
	.hint('Enter a detailed description')
	.hintIcon('Info');
```
