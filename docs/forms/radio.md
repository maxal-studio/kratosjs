---
title: Radio
---

# Radio

The radio field allows you to select a single option from a list.

## Basic Usage

```typescript
import { Radio } from '@maxal_studio/kratosjs';

Radio.make('status').options({
	draft: 'Draft',
	published: 'Published',
	archived: 'Archived',
});
```

## Options

Set the available options:

```typescript
Radio.make('role').options({
	admin: 'Administrator',
	user: 'User',
	guest: 'Guest',
});
```

## Boolean Radio

Create a yes/no radio button:

```typescript
Radio.make('verified').boolean('Yes', 'No');
```

## Inline

Display radio buttons inline:

```typescript
Radio.make('status').options({ draft: 'Draft', published: 'Published' }).inline();
```

## Label

```typescript
Radio.make('status').label('Status');
```

## Default Value

```typescript
Radio.make('status').options({ draft: 'Draft', published: 'Published' }).default('draft');
```

## Required

```typescript
Radio.make('status').options({ draft: 'Draft', published: 'Published' }).required();
```

## Helper Text

```typescript
Radio.make('status').helperText('Select the status');
```

## Hints

```typescript
Radio.make('status').hint('Choose a status').hintIcon('Info');
```

## Hidden

```typescript
Radio.make('internal').hidden();
```

## Disabled

```typescript
Radio.make('status').disabled();
```

## Complete Example

```typescript
Radio.make('status')
	.label('Status')
	.options({
		draft: 'Draft',
		published: 'Published',
		archived: 'Archived',
	})
	.default('draft')
	.required()
	.hint('Select the status')
	.hintIcon('Info');
```
