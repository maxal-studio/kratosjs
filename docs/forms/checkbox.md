---
title: Checkbox
---

# Checkbox

The checkbox field allows you to interact with boolean values.

## Basic Usage

```typescript
import { Checkbox } from '@maxal_studio/kratosjs';

Checkbox.make('active');
```

## Boolean Checkbox

Mark as a boolean checkbox:

```typescript
Checkbox.make('active').boolean();
```

## Inline

Display checkbox inline:

```typescript
Checkbox.make('active').inline();
```

## Label

```typescript
Checkbox.make('active').label('Is Active');
```

## Default Value

```typescript
Checkbox.make('active').default(true);
```

## Required

```typescript
Checkbox.make('terms').required();
```

## Helper Text

```typescript
Checkbox.make('terms').helperText('You must agree to the terms');
```

## Hints

```typescript
Checkbox.make('newsletter').hint('Subscribe to our newsletter').hintIcon('Mail');
```

## Hidden

```typescript
Checkbox.make('internal').hidden();
```

## Disabled

```typescript
Checkbox.make('active').disabled();
```

## Complete Example

```typescript
Checkbox.make('active')
	.label('Is Active')
	.boolean()
	.inline()
	.default(true)
	.hint('Check if the item is active')
	.hintIcon('Check');
```
