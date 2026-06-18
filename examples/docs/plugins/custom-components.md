# Custom Components in Plugins

This guide explains how to create and register custom React components (fields, columns, widgets, and blocks) in your plugins.

## Overview

KratosJs supports four types of custom components:

- **Custom Fields** - Form input components (e.g., star rating, color picker)
- **Custom Columns** - Table column renderers (e.g., badge columns, image columns)
- **Custom Widgets** - Dashboard/widget components (e.g., stats cards, charts)
- **Custom Blocks** - Page block components (e.g., custom content sections, live feeds)

Components are composed at **build time**.

1. The plugin ships its React components in a `./client` entry, exported as a manifest via `definePluginClient`
2. The app owns the admin entry (`src/admin/main.tsx`) and statically imports the plugin client manifests
3. The app's Vite build bundles everything with a single shared React instance — this works identically in dev and production
4. Server-side, the plugin registers only the component **names** (`panel.registerCustomField('star-rating')`) so they appear in panel metadata

There is no runtime component discovery, no virtual URLs, and no on-the-fly transformation.

## The Plugin Client Entry

A plugin with UI components exports a client manifest:

```typescript
// plugins/star-rating/src/client/index.ts
import { definePluginClient } from '@maxal_studio/kratosjs-react';
import StarRatingField from './StarRatingField';
import StarRatingColumn from './StarRatingColumn';
import CardWidget from './CardWidget';

export default definePluginClient({
	name: 'star-rating',
	fields: { 'star-rating': StarRatingField },
	columns: { 'star-rating': StarRatingColumn },
	widgets: { card: CardWidget },
	// blocks: { 'lives-page': LivesPageBlock },
	// rules: { phone: phoneRule }, // custom validation rules — see Creating Plugins
});
```

The manifest may also carry custom validation `rules` so they validate on the
client exactly as on the server — see
[Custom Validation Rules](./creating-plugins.md#custom-validation-rules).

The manifest keys (`'star-rating'`, `'card'`, ...) must match:

- the `componentType`/`columnType` of the backend builder classes
- the names registered server-side with `panel.registerCustomField/Column/Widget/Block`

And in `package.json`:

```json
{
	"exports": {
		".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
		"./client": { "types": "./dist/client/index.d.ts", "default": "./dist/client/index.js" }
	},
	"peerDependencies": {
		"react": ">=18",
		"@maxal_studio/kratosjs-react": "*",
		"@maxal_studio/kratosjs": "*"
	}
}
```

React is a **peer dependency** — it is never bundled inside the plugin, so the app controls the single React instance.

## The App's Admin Entry

Every KratosJs app has `index.html`, `vite.config.mts`, and `src/admin/main.tsx` as standard files. Scaffold them with `npx @maxal_studio/kratosjs-cli init` (or they are auto-created on first dev start). Plugins with custom UI add their `/client` imports to the existing `src/admin/main.tsx`:

The app statically imports the plugin clients and mounts the panel:

```typescript
// src/admin/main.tsx
import { mountAdminPanel } from '@maxal_studio/kratosjs-react';
import '@maxal_studio/kratosjs-react/styles.css';

import starRating from '@maxal_studio/kratosjs-plugin-star-rating/client';
import permissions from '@maxal_studio/kratosjs-plugin-permissions/client';

mountAdminPanel({
	plugins: [starRating, permissions],
});
```

```html
<!-- index.html (app root) -->
<!doctype html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<!-- VALAJS_PANEL_FAVICON -->
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<!-- VALAJS_PANEL_TITLE -->
		<!-- VALAJS_PANEL_SETTINGS -->
	</head>
	<body>
		<div id="root"></div>
		<script type="module" src="/src/admin/main.tsx"></script>
	</body>
</html>
```

```typescript
// vite.config.mts
import { defineConfig } from 'vite';
import { kratosAdminVite } from '@maxal_studio/kratosjs/vite';

export default defineConfig(kratosAdminVite());
```

### Dev vs Production

- **Development** (`npm run dev`): the KratosJs server serves the app's `index.html` + entry through vite-express with HMR
- **Production**: run `vite build` (outputs to `dist/admin`), then start the server with `NODE_ENV=production` — it serves the static bundle with SPA fallback and HTML transformation (title, favicon, settings injection)

Typical app scripts:

```json
{
	"scripts": {
		"dev": "tsx watch src/index.ts",
		"build": "npm run build:server && npm run build:admin",
		"build:server": "tsc",
		"build:admin": "vite build",
		"start": "NODE_ENV=production node dist/index.js"
	}
}
```

## Creating Custom Fields

### 1. Create the Component

```typescript
// src/client/StarRatingField.tsx
import { FieldProps, useValidation, getFieldError, ViewFieldWrapper, cn } from '@maxal_studio/kratosjs-react';
import { useFormContext, useWatch } from 'react-hook-form';

export default function StarRatingField(props: FieldProps) {
  // View mode: render formatted display
  if (props.mode === 'view') {
    const value = props.value || 0;
    const maxStars = props.maxStars || 5;

    return (
      <ViewFieldWrapper label={props.label}>
        <div className="flex items-center gap-2">
          {Array.from({ length: maxStars }, (_, i) => i + 1).map(star => (
            <span
              key={star}
              className={cn('text-lg', star <= value ? 'text-yellow-400' : 'text-gray-300')}>
              {star <= value ? '⭐' : '☆'}
            </span>
          ))}
        </div>
      </ViewFieldWrapper>
    );
  }

  // Edit mode: render interactive input
  const { register, setValue, formState: { errors } } = useFormContext();
  const fieldValue = useWatch({ name: props.name }) || 0;
  const maxStars = props.maxStars || 5;

  // Run this field's rules through the shared engine (same one the server uses).
  // Pass props.operation + props.name so conditional/cross-field rules resolve.
  const validation = useValidation(props.validation?.rules || [], props.operation, props.name);
  const error = getFieldError(errors, props.name);

  return (
    <div>
      <label className="block text-sm font-medium kratosjstext-primary mb-2">
        {props.label}
        {validation.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex items-center gap-2">
        {Array.from({ length: maxStars }, (_, i) => i + 1).map(star => (
          <button
            key={star}
            type="button"
            onClick={() => setValue(props.name, star, { shouldValidate: true })}
            className={cn(
              'text-2xl transition-colors',
              star <= fieldValue ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'
            )}>
            {star <= fieldValue ? '⭐' : '☆'}
          </button>
        ))}
      </div>
      {/* Hidden input wires the value into react-hook-form with validation */}
      <input type="hidden" {...register(props.name, validation)} value={fieldValue} />
      {error && (
        <p className="mt-1 text-sm text-red-500">{error.message as string}</p>
      )}
    </div>
  );
}
```

### 2. Create the Backend Field Class

The backend class is exported from the plugin's **server** entry, so resources can use it in `FormBuilder` schemas:

```typescript
// src/StarRating.ts
import { Field } from '@maxal_studio/kratosjs';

export class StarRating extends Field {
	protected componentType = 'star-rating';
	protected _maxStars = 5;

	maxStars(count: number): this {
		this._maxStars = count;
		return this;
	}

	toJSON() {
		const json = super.toJSON();
		if (this._maxStars !== 5) json.maxStars = this._maxStars;
		return json;
	}

	static make(name: string): StarRating {
		const instance = new this(name);
		instance.configure();
		return instance;
	}
}
```

### 3. Register the Field Name in Your Plugin

```typescript
// src/StarRatingPlugin.ts
import { Plugin, Panel } from '@maxal_studio/kratosjs';

export class StarRatingPlugin extends Plugin {
	getName(): string {
		return 'star-rating';
	}

	register(panel: Panel): void {
		// Name only — the React component is bundled by the app's admin client
		panel.registerCustomField('star-rating');
		panel.registerCustomColumn('star-rating');
		panel.registerCustomWidget('card');
	}
}
```

### 4. Add the Component to the Client Manifest

```typescript
// src/client/index.ts
import { definePluginClient } from '@maxal_studio/kratosjs-react';
import StarRatingField from './StarRatingField';

export default definePluginClient({
	name: 'star-rating',
	fields: { 'star-rating': StarRatingField },
});
```

### 5. Use in Resources

```typescript
// In any resource (app or another plugin)
import { StarRating } from '@maxal_studio/kratosjs-plugin-star-rating';

static form() {
  return FormBuilder.make().schema([
    StarRating.make('rating').label('Rating').maxStars(5).required(),
  ]);
}
```

## Creating Custom Columns

The pattern is identical to fields:

```typescript
// src/client/StarRatingColumn.tsx
import { ColumnProps, cn } from '@maxal_studio/kratosjs-react';

export default function StarRatingColumn({ column, record }: ColumnProps) {
  const value = record[column.name];
  const maxStars = (column as any).maxStars || 5;

  if (value === null || value === undefined || value === 0) {
    return <span className="kratosjstext-secondary">Not rated</span>;
  }

  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: maxStars }, (_, i) => i + 1).map(star => (
        <span
          key={star}
          className={cn('text-lg', star <= value ? 'text-yellow-400' : 'text-gray-300')}>
          {star <= value ? '⭐' : '☆'}
        </span>
      ))}
    </div>
  );
}
```

Backend column class (server entry):

```typescript
// src/StarRatingColumn.ts
import { Column } from '@maxal_studio/kratosjs';

export class StarRatingColumn extends Column {
	protected columnType = 'star-rating';
	// ... builder methods + toJSON, like the field
}
```

Register the name (`panel.registerCustomColumn('star-rating')`), add it to the client manifest (`columns: { 'star-rating': StarRatingColumn }`), and use it in any `TableBuilder`:

```typescript
import { StarRatingColumn } from '@maxal_studio/kratosjs-plugin-star-rating';

static table() {
  return TableBuilder.make().columns([
    StarRatingColumn.make('rating').label('Rating').sortable(),
  ]);
}
```

## Creating Custom Widgets

```typescript
// src/client/CardWidget.tsx
import { Icon, cn, WidgetComponentProps } from '@maxal_studio/kratosjs-react';

export default function CardWidget({ widget, data }: WidgetComponentProps) {
  if (!data) {
    return (
      <div className="aspect-video kratosjsbg-surface rounded-lg border p-6">
        <p className="text-sm kratosjstext-secondary">No data available</p>
      </div>
    );
  }

  return (
    <div className="aspect-video kratosjsbg-surface rounded-lg border p-6">
      <div className="flex items-center justify-between mb-2">
        {widget.label && <p className="text-xs font-medium kratosjstext-secondary">{widget.label}</p>}
        {widget.icon && <Icon name={widget.icon} className="w-4 h-4" />}
      </div>
      <p className="text-2xl font-semibold kratosjstext-primary">{data.value}</p>
    </div>
  );
}
```

Register with `panel.registerCustomWidget('card')`, add to the manifest (`widgets: { card: CardWidget }`), and use in pages:

```typescript
// In a Page's blocks() method
static async blocks() {
  const cardWidget = CustomWidget.make('my-card')
    .label('My Card')
    .icon('TrendingUp')
    .type('card'); // matches the registered widget name

  return [WidgetBlock.make(cardWidget).columns(3)];
}
```

## Creating Custom Blocks

Custom blocks are page-level components rendered when a page includes a block with a matching `type`.

### 1. Create the Block Component

```typescript
// src/client/LivesPageBlock.tsx
import type { CustomBlockComponentProps } from '@maxal_studio/kratosjs-react';

export default function LivesPageBlock({ block, blockData, apiBaseUrl }: CustomBlockComponentProps) {
  return (
    <div className="p-4 kratosjsbg-surface rounded-lg border kratosjsborder">
      <p className="kratosjstext-primary">
        Block type: {block.type} | Title: {block.title}
      </p>
    </div>
  );
}
```

### 2. Create the Backend Block Class

```typescript
// src/LivesPageBlock.ts
import { Block, SerializedBlock } from '@maxal_studio/kratosjs';

export class LivesPageBlock extends Block {
	protected blockType = 'lives-page' as const;

	static make(): LivesPageBlock {
		return new LivesPageBlock();
	}

	toJSON(): SerializedBlock {
		return {
			type: 'lives-page',
			...(this._title !== undefined && { title: this._title }),
			...(this._subtitle !== undefined && { subtitle: this._subtitle }),
			...(this._columns !== undefined && { columns: this._columns }),
		};
	}
}
```

### 3. Register and Use

```typescript
// Plugin
register(panel: Panel): void {
  panel.registerPage(LivesPage);
  panel.registerCustomBlock('lives-page');
}

// Client manifest
export default definePluginClient({
	blocks: { 'lives-page': LivesPageBlock },
});

// Page
static async blocks() {
  return [LivesPageBlock.make().title('Live feed').columns(12)];
}
```

## Creating Custom Container Components

Layout components that wrap **other form components** (like `Section`, `Group`, `Tabs`, `Repeater`) declare their children through one contract, so the core — defaults extraction, validation, the permissions structure, global `configureUsing`, and the form renderer — discovers nested fields **generically**, with no type-specific code.

A container declares three things on its backend builder:

| Method                                  | Meaning                                                                                                                                                          |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getChildComponents(): Component[]`     | the nested form components                                                                                                                                       |
| `isLayoutComponent(): boolean`          | `true` for pure layout containers that hold no value of their own                                                                                                |
| `getChildScope(): 'inherit' \| 'array'` | `'inherit'` = children write to the parent record; `'array'` = children are an item template whose value lives under this component's own name (like `Repeater`) |

The base `Component.toJSON()` automatically serializes children under the canonical `schema` key plus `isLayout` / `childScope` metadata — the contract the frontend walker (`runtime/formTraversal`) reads.

```typescript
import { Component } from '@maxal_studio/kratosjs';

export class Fieldset extends Component {
	protected componentType = 'fieldset';
	private _children: Component[] = [];

	static make(name: string) {
		const instance = new Fieldset(name);
		instance.configure();
		return instance;
	}

	schema(children: Component[]) {
		this._children = children;
		return this;
	}

	// --- the children contract ---
	getChildComponents(): Component[] {
		return this._children;
	}
	isLayoutComponent(): boolean {
		return true; // pure layout — no value of its own
	}
	getChildScope(): 'inherit' | 'array' {
		return 'inherit'; // children write to the parent record
	}
}
```

Register its name (`panel.registerCustomField('fieldset')`) and provide a React renderer that reads `field.schema` and renders each child via `<FieldRenderer>` — exactly like the built-in `GroupField`. Defaults, validation, and permission filtering for the nested fields work automatically.

> For an array-scope container (a custom repeater-like component), return `'array'` from `getChildScope()`. The core then treats the children as a per-item template and never leaks their names into the parent form scope.

## Naming Rules

The same name string ties everything together:

| Where                                                    | Example                                      |
| -------------------------------------------------------- | -------------------------------------------- |
| Backend builder `componentType`/`columnType`/`blockType` | `'star-rating'`                              |
| Server registration                                      | `panel.registerCustomField('star-rating')`   |
| Client manifest key                                      | `fields: { 'star-rating': StarRatingField }` |

Names are kebab-case by convention.

## Troubleshooting

### Component Not Rendering

- **Check the manifest**: the component must be in the plugin's `definePluginClient({...})` under the right registry (`fields`, `columns`, `widgets`, `blocks`)
- **Check the app entry**: the plugin's `/client` manifest must be passed to `mountAdminPanel({ plugins: [...] })`
- **Check names**: the manifest key must exactly match the backend builder's type string

### Component Not Found in Metadata

- Verify the plugin is registered with `panel.plugins([...])`
- Check that `registerCustomField/Column/Widget/Block` is called in the plugin's `register()` method

### Multiple React Instances / Hook Errors

- Ensure `react` is a `peerDependency` of the plugin, never a `dependency`
- The `kratosAdminVite()` factory already dedupes `react`, `react-dom`, and `react-hook-form`

### Production Build Issues

- Run `vite build` in the app — components are bundled into `dist/admin`
- Start with `NODE_ENV=production`; the server serves the static bundle automatically

## Next Steps

- See [Creating Plugins](./creating-plugins.md) for the full plugin package format
