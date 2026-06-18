# TagsInput

The `TagsInput` component allows users to input and manage arrays of simple values (strings, numbers, IDs, etc.). It's perfect for managing lists like tags, keywords, user IDs, or any collection of simple values.

## Basic Usage

```typescript
import { TagsInput } from '@maxal_studio/kratosjs';

TagsInput.make('tags').label('Tags');
```

## Features

### Separator

Define what character separates values when typing:

```typescript
TagsInput.make('keywords').label('Keywords').separator(','); // Default is comma
```

### Suggestions

Provide autocomplete suggestions:

```typescript
TagsInput.make('categories').label('Categories').suggestions(['Technology', 'Design', 'Marketing', 'Sales']);
```

### Min/Max Items

Control the number of items allowed:

```typescript
TagsInput.make('tags')
	.label('Tags')
	.minItems(1) // At least 1 tag required
	.maxItems(10); // Maximum 10 tags
```

### Required Field

Mark the field as required (automatically sets minItems to 1 if not specified):

```typescript
TagsInput.make('tags').label('Tags').required(); // At least 1 tag required
```

### Placeholder

Set placeholder text:

```typescript
TagsInput.make('emails').label('Email Addresses').placeholder('Enter email addresses separated by comma');
```

### Add/Delete/Reorder Controls

Control user interactions with tags:

```typescript
TagsInput.make('tags')
	.label('Tags')
	.addable(true) // Allow adding new tags (default: true)
	.deletable(true) // Allow deleting tags (default: true)
	.reorderable(true); // Allow drag-and-drop reordering (default: true)
```

When `reorderable(true)`, users can drag and drop tags to reorder them. A grip icon appears on each tag to indicate it's draggable.

## Complete Example

```typescript
import { FormBuilder, TagsInput } from '@maxal_studio/kratosjs';

const form = FormBuilder.make().schema([
	TagsInput.make('tags')
		.label('Tags')
		.placeholder('Enter tags separated by comma')
		.separator(',')
		.suggestions(['JavaScript', 'TypeScript', 'React', 'Vue', 'Angular'])
		.minItems(1)
		.maxItems(5)
		.helperText('Add up to 5 tags for this post')
		.hint('Tags help categorize your content')
		.hintIcon('Tag'),

	TagsInput.make('userIds')
		.label('User IDs')
		.placeholder('Enter user IDs')
		.required()
		.helperText('Add user IDs separated by comma'),

	TagsInput.make('keywords')
		.label('SEO Keywords')
		.placeholder('Enter keywords')
		.maxItems(10)
		.deletable(true)
		.reorderable(false),
]);
```

## Use Cases

### User IDs Array

```typescript
TagsInput.make('joinedUserIds').label('Joined User IDs').placeholder('Enter user IDs').required();
```

### Tags/Keywords

```typescript
TagsInput.make('tags').label('Post Tags').suggestions(['News', 'Tutorial', 'Update', 'Feature']).maxItems(5);
```

### Email List

```typescript
TagsInput.make('recipients').label('Email Recipients').placeholder('Enter email addresses').separator(',').minItems(1);
```

### Categories

```typescript
TagsInput.make('categories')
	.label('Categories')
	.suggestions(['Technology', 'Business', 'Lifestyle', 'Health'])
	.required()
	.maxItems(3);
```

## Validation

The `TagsInput` component automatically validates:

- **Required**: Ensures at least one item is present (or minItems if specified)
- **Min Items**: Validates minimum number of items
- **Max Items**: Validates maximum number of items
- Prevents deletion below minItems
- Prevents addition above maxItems

```typescript
TagsInput.make('tags')
	.label('Tags')
	.required() // At least 1 tag
	.minItems(2) // Actually requires 2 tags (overrides required's default of 1)
	.maxItems(10); // Maximum 10 tags
```

## User Interaction

- **Adding tags**: Type and press Enter or the separator character
- **Removing tags**: Click the X button on each tag (if deletable is true)
- **Reordering tags**: Drag and drop tags to reorder them (if reorderable is true)
- **Backspace**: Press backspace on empty input to remove last tag
- **Blur**: When you click outside, any remaining input is added as a tag
- **Suggestions**: Start typing to see autocomplete suggestions (if provided)

### Drag-and-Drop Reordering

When `reorderable` is enabled, each tag displays a grip icon (⋮⋮) and can be dragged to a new position. Visual feedback includes:

- Cursor changes to `move` when hovering over tags
- Dragged tag becomes semi-transparent
- Drop target scales up and shows a blue ring
- Smooth animations during reordering

## Styling

The component uses KratosJs design tokens and supports:

- Dark mode automatically
- Error states (red border when invalid)
- Disabled states
- Focus states
- Responsive design

## Props Reference

| Method          | Type       | Default     | Description                                      |
| --------------- | ---------- | ----------- | ------------------------------------------------ |
| `separator()`   | `string`   | `','`       | Character that separates values when typing      |
| `suggestions()` | `string[]` | `undefined` | Array of autocomplete suggestions                |
| `minItems()`    | `number`   | `undefined` | Minimum number of items required                 |
| `maxItems()`    | `number`   | `undefined` | Maximum number of items allowed                  |
| `addable()`     | `boolean`  | `true`      | Whether users can add new items                  |
| `deletable()`   | `boolean`  | `true`      | Whether users can delete items                   |
| `reorderable()` | `boolean`  | `true`      | Whether users can drag-and-drop to reorder items |

## Data Format

The component returns an array of strings:

```json
{
	"tags": ["JavaScript", "TypeScript", "React"]
}
```

For numeric IDs or other types, they are stored as strings in the array and should be converted on the backend as needed.
