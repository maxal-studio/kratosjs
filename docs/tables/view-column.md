---
title: View Column
---

# View Column (`ViewColumn`)

The `ViewColumn` allows you to define custom rendering for a column using a view/template identifier. This is useful when you need to render complex content that doesn't fit into the standard column types.

```typescript
import { ViewColumn } from '@maxal_studio/kratosjs';

ViewColumn.make('customContent').label('Custom View').view('custom-column-template');
```

## Available Options

- `make(name: string)`: Creates a new `ViewColumn` instance.
- `label(text: Resolvable<string>)`: Sets the column header label.
- `view(view: string)`: Sets the custom view/template identifier that will be used to render the column content.
- `sortable(condition?: Resolvable<boolean>)`: Enables sorting for this column.
- `searchable(condition?: Resolvable<boolean>)`: Enables searching for this column.
- `hidden(condition?: Resolvable<boolean>)`: Hides the column.
- `disabled(condition?: Resolvable<boolean>)`: Disables the column.
- `width(width: string | number)`: Sets the column width.
- `alignment(alignment: 'left' | 'center' | 'right')`: Sets alignment.
- `toggleable(condition?: Resolvable<boolean>)`: Allows column visibility to be toggled.
- `description(text: Resolvable<string>)`: Adds a description below the column label.

## Usage

The `ViewColumn` is typically used when you need to render custom React components or complex layouts that aren't covered by the standard column types. The frontend will use the `view` identifier to determine which component to render.

```typescript
ViewColumn.make('statusBadge').label('Status').view('status-badge-component').sortable().width(120);
```

## Complete Example

```typescript
ViewColumn.make('customWidget').label('Custom Widget').view('my-custom-widget').alignment('center').width(200);
```
