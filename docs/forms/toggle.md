---
title: Toggle
---

# Toggle

The toggle field allows you to interact with boolean values using a switch.

## Basic Usage

```typescript
import { Toggle } from '@maxal_studio/kratosjs';

Toggle.make('active');
```

## Boolean Toggle

Mark as a boolean toggle:

```typescript
Toggle.make('active').boolean();
```

## Icons

Set icons for on and off states:

```typescript
Toggle.make('active').onIcon('Check').offIcon('X');
```

## Colors

Set colors for on and off states:

```typescript
Toggle.make('active').onColor('text-green-600').offColor('text-gray-400');
```

## Inline

Display toggle inline:

```typescript
Toggle.make('active').inline();
```

## Label

```typescript
Toggle.make('active').label('Is Active');
```

## Default Value

```typescript
Toggle.make('active').default(true);
```

## Required

```typescript
Toggle.make('enabled').required();
```

## Helper Text

```typescript
Toggle.make('active').helperText('Enable this feature');
```

## Hints

```typescript
Toggle.make('active').hint('Enable to activate').hintIcon('Power');
```

## Hidden

```typescript
Toggle.make('internal').hidden();
```

## Disabled

```typescript
Toggle.make('active').disabled();
```

## Complete Example

```typescript
Toggle.make('active')
	.label('Is Active')
	.boolean()
	.onIcon('Check')
	.offIcon('X')
	.onColor('text-green-600')
	.offColor('text-gray-400')
	.default(true)
	.hint('Enable to activate')
	.hintIcon('Power');
```
