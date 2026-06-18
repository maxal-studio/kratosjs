---
title: Custom Columns
---

# Creating Custom Table Columns

KratosJs allows you to create custom table columns to extend the built-in column types. This involves creating both a backend column class and a frontend React component — **no plugin required**. You register the component directly on `mountAdminPanel()` in your app's admin entry (`src/admin/main.tsx`).

> To redistribute a column across apps, package it as a plugin instead — the component contract is identical. See [Custom Components in Plugins](/plugins/custom-components).

## Backend: Creating a Custom Column Class

### 1. Extend the Column Class

Create a new TypeScript class that extends `Column`:

```typescript
// src/columns/ProgressColumn.ts
import { Column } from '@maxal_studio/kratosjs';
import { SerializedColumn } from '@maxal_studio/kratosjs';

export class ProgressColumn extends Column {
	protected columnType: string = 'progress';
	protected _showPercentage: boolean = true;
	protected _color?: string | ((value: number) => string);

	/**
	 * Show percentage text
	 */
	showPercentage(show: boolean = true): this {
		this._showPercentage = show;
		return this;
	}

	/**
	 * Set color (static or dynamic)
	 */
	color(color: string | ((value: number) => string)): this {
		this._color = color;
		return this;
	}

	/**
	 * Serialize to JSON
	 */
	toJSON(): SerializedColumn {
		const json = super.toJSON();
		json.showPercentage = this._showPercentage;
		if (this._color) {
			if (typeof this._color === 'function') {
				json.colorFn = this._color.toString();
			} else {
				json.color = this._color;
			}
		}
		return json;
	}

	/**
	 * Factory method
	 */
	static make(name: string): ProgressColumn {
		const column = new ProgressColumn(name);
		column.configure();
		return column;
	}
}
```

### 2. Using Your Custom Column

Use your custom column in table schemas:

```typescript
import { TableBuilder } from '@maxal_studio/kratosjs';
import { ProgressColumn } from '../columns/ProgressColumn';

const table = TableBuilder.make().columns([
	ProgressColumn.make('completion')
		.label('Progress')
		.showPercentage()
		.color(value => {
			if (value >= 80) return 'green';
			if (value >= 50) return 'yellow';
			return 'red';
		}),
]);
```

## Frontend: Creating a React Component

### 1. Create the React Component

Create a React component that handles the column rendering:

```typescript
// src/components/ProgressColumnComponent.tsx
import React from 'react';
import { SerializedColumn } from '@maxal_studio/kratosjs';

interface ColumnProps {
	column: SerializedColumn;
	record: any;
	rowIndex: number;
}

export function ProgressColumnComponent({ column, record }: ColumnProps) {
	const value = record[column.name] || 0;
	const showPercentage = (column as any).showPercentage !== false;
	const color = (column as any).color || 'blue';

	// Evaluate color function if present
	let displayColor = color;
	if ((column as any).colorFn) {
		try {
			const colorFn = eval(`(${(column as any).colorFn})`);
			displayColor = colorFn(value);
		} catch (e) {
			console.error('Error evaluating color function:', e);
		}
	}

	const colorClasses: Record<string, string> = {
		green: 'bg-green-500',
		yellow: 'bg-yellow-500',
		red: 'bg-red-500',
		blue: 'bg-blue-500',
	};

	return (
		<div className="w-full">
			<div className="flex items-center gap-2">
				<div className="flex-1 bg-gray-200 rounded-full h-2.5">
					<div
						className={`h-2.5 rounded-full ${colorClasses[displayColor] || colorClasses.blue}`}
						style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
					/>
				</div>
				{showPercentage && <span className="text-sm text-gray-600">{value}%</span>}
			</div>
		</div>
	);
}
```

### 2. Register Your Custom Column

Register your component on `mountAdminPanel()` in your app's admin entry. The key must match the `columnType` from your backend column class:

```typescript
// src/admin/main.tsx
import { mountAdminPanel } from '@maxal_studio/kratosjs-react';
import '@maxal_studio/kratosjs-react/styles.css';
import { ProgressColumnComponent } from './components/ProgressColumnComponent';

mountAdminPanel({
	columns: {
		progress: ProgressColumnComponent, // ✅ key matches columnType
	},
});
```

> **Optional metadata** — the backend can also call `panel.registerCustomColumn('progress')` so the type name appears in panel metadata. This is informational only; rendering is driven by the `columns` registry.

## Complete Example

### Backend Column Class

```typescript
// src/columns/AvatarColumn.ts
import { Column } from '@maxal_studio/kratosjs';
import { SerializedColumn } from '@maxal_studio/kratosjs';

export class AvatarColumn extends Column {
	protected columnType: string = 'avatar';
	protected _size: number = 40;
	protected _showName: boolean = false;
	protected _nameField?: string;

	size(size: number): this {
		this._size = size;
		return this;
	}

	showName(show: boolean = true): this {
		this._showName = show;
		return this;
	}

	nameField(field: string): this {
		this._nameField = field;
		this._showName = true;
		return this;
	}

	toJSON(): SerializedColumn {
		const json = super.toJSON();
		json.size = this._size;
		json.showName = this._showName;
		if (this._nameField) {
			json.nameField = this._nameField;
		}
		return json;
	}

	static make(name: string): AvatarColumn {
		const column = new AvatarColumn(name);
		column.configure();
		return column;
	}
}
```

### Frontend Component

```typescript
// src/components/AvatarColumnComponent.tsx
import React from 'react';
import { SerializedColumn } from '@maxal_studio/kratosjs';
import { User } from 'lucide-react';

interface ColumnProps {
	column: SerializedColumn;
	record: any;
	rowIndex: number;
}

export function AvatarColumnComponent({ column, record }: ColumnProps) {
	const imageUrl = record[column.name];
	const size = (column as any).size || 40;
	const showName = (column as any).showName || false;
	const nameField = (column as any).nameField;
	const name = nameField ? record[nameField] : null;

	return (
		<div className="flex items-center gap-2">
			{imageUrl ? (
				<img
					src={imageUrl}
					alt={name || 'Avatar'}
					className="rounded-full"
					style={{ width: size, height: size }}
				/>
			) : (
				<div
					className="rounded-full bg-gray-200 flex items-center justify-center"
					style={{ width: size, height: size }}
				>
					<User className="w-1/2 h-1/2 text-gray-400" />
				</div>
			)}
			{showName && name && <span className="text-sm text-gray-700">{name}</span>}
		</div>
	);
}
```

### Registration

```typescript
// src/admin/main.tsx
import { mountAdminPanel } from '@maxal_studio/kratosjs-react';
import '@maxal_studio/kratosjs-react/styles.css';
import { AvatarColumnComponent } from './components/AvatarColumnComponent';

mountAdminPanel({
	columns: {
		avatar: AvatarColumnComponent,
	},
});
```

> A complete, runnable `star-rating` column lives in `examples/sql-app` — see `src/columns/StarRatingColumn.ts` and `src/admin/main.tsx`.

## Column Props Interface

`ColumnProps` is exported from `@maxal_studio/kratosjs-react` — import it instead of redeclaring it:

```typescript
import type { ColumnProps } from '@maxal_studio/kratosjs-react';

interface ColumnProps {
	column: SerializedColumn; // The serialized column schema
	record: any; // The current row record
	rowIndex: number; // The row index (0-based)
}
```

## Editable Columns

Editable column types (`textinput`, `select`, `checkbox`, `toggle`) receive an extra `onCellChange` callback that the table wires up for inline editing. Call it with the new value:

```typescript
// src/components/EditableProgressColumnComponent.tsx
import { useState } from 'react';
import type { ColumnProps } from '@maxal_studio/kratosjs-react';

// onCellChange is supplied by the table for editable column types.
type EditableColumnProps = ColumnProps & { onCellChange?: (value: any) => void };

export function EditableProgressColumnComponent({ column, record, onCellChange }: EditableColumnProps) {
	const [value, setValue] = useState(record[column.name] || 0);

	const handleChange = (newValue: number) => {
		setValue(newValue);
		onCellChange?.(newValue);
	};

	return (
		<div className="w-full">
			<input
				type="range"
				min="0"
				max="100"
				value={value}
				onChange={e => handleChange(Number(e.target.value))}
				className="w-full"
			/>
		</div>
	);
}
```

## Best Practices

1. **Use standard column methods**: Your custom column can use all base `Column` methods like `.label()`, `.sortable()`, `.searchable()`, etc.
2. **Handle edge cases**: Always handle null/undefined values and missing data gracefully.
3. **Type safety**: Use TypeScript interfaces for your custom column's JSON schema.
4. **Performance**: Keep rendering logic efficient, especially for large tables.
5. **Accessibility**: Ensure your custom columns are accessible (keyboard navigation, screen readers).
