---
title: Custom Blocks
---

# Creating Custom Blocks

Beyond the built-in [block types](/pages/blocks) (`widget`, `form`, `table`, `tabs`), you can render your own page block — **no plugin required**. As with [custom fields](/forms/custom-fields), [custom columns](/tables/custom-columns), and [custom widgets](/resources/custom-widgets), you define a backend block class and register a React component on `mountAdminPanel()`.

> To redistribute a block across apps, package it as a plugin instead — the component contract is identical. See [Custom Components in Plugins](/plugins/custom-components).

## How it works

The frontend `BlockRenderer` dispatches the four built-in block types itself and looks up any **other** `type` in the block registry. So a custom block needs exactly two things:

1. A backend `Block` subclass whose `toJSON()` emits a unique `type`.
2. A React component registered under that same `type` via `mountAdminPanel({ blocks: { ... } })`.

The block's `title` / `subtitle` are rendered by the surrounding block chrome; your component renders the body.

## 1. Create the backend block class

Extend `Block`, give it a unique `blockType`, and serialize any extra props in `toJSON()`:

```typescript
// src/blocks/CalloutBlock.ts
import { Block, type SerializedBlock } from '@maxal_studio/kratosjs';

type CalloutTone = 'info' | 'success' | 'warning';

export class CalloutBlock extends Block {
	protected blockType = 'callout' as const;
	private _message = '';
	private _tone: CalloutTone = 'info';

	static make(): CalloutBlock {
		return new CalloutBlock();
	}

	message(text: string): this {
		this._message = text;
		return this;
	}

	tone(tone: CalloutTone): this {
		this._tone = tone;
		return this;
	}

	toJSON(): SerializedBlock {
		return {
			type: 'callout',
			message: this._message,
			tone: this._tone,
			...(this._title !== undefined && { title: this._title }),
			...(this._subtitle !== undefined && { subtitle: this._subtitle }),
			...(this._columns !== undefined && { columns: this._columns }),
		};
	}
}
```

## 2. Create the React component

The component receives `CustomBlockComponentProps` (`block`, `blockData?`, `apiBaseUrl?`). Custom props you serialized on the backend (`message`, `tone`) are available on `block`:

```tsx
// src/admin/components/CalloutBlock.tsx
import type { CustomBlockComponentProps } from '@maxal_studio/kratosjs-react';
import { cn } from '@maxal_studio/kratosjs-react';

// Use Tailwind classes the framework already ships (with `dark:` variants) so the
// block looks right in both themes. The prebuilt stylesheet does not include
// opacity modifiers like `bg-blue-950/40`, so stick to plain shades.
const toneClasses: Record<string, string> = {
	info: 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100',
	success: 'border-green-300 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100',
	warning:
		'border-yellow-300 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100',
};

export default function CalloutBlock({ block }: CustomBlockComponentProps) {
	const tone = (block.tone as string) || 'info';
	return (
		<div className={cn('rounded-lg border p-4', toneClasses[tone] ?? toneClasses.info)}>
			<p className="text-sm">{block.message}</p>
		</div>
	);
}
```

## 3. Register the component

The key must match the block's `type`:

```typescript
// src/admin/main.tsx
import { mountAdminPanel } from '@maxal_studio/kratosjs-react';
import '@maxal_studio/kratosjs-react/styles.css';
import CalloutBlock from './components/CalloutBlock';

mountAdminPanel({
	blocks: {
		callout: CalloutBlock, // ✅ key matches the blockType
	},
});
```

> **Optional metadata** — the backend can also call `panel.registerCustomBlock('callout')` so the type name appears in panel metadata. This is informational only; rendering is driven by the `blocks` registry.

## 4. Use it on a page

Custom blocks render inside a [page](/pages/creating-pages). Return them from the page's `blocks()` method:

```typescript
// src/pages/DashboardPage.ts
import { Page } from '@maxal_studio/kratosjs';
import { CalloutBlock } from '../blocks/CalloutBlock';

export class DashboardPage extends Page {
	static slug = 'dashboard';
	static label = 'Dashboard';
	static icon = 'LayoutDashboard';
	static navigationGroup = 'App';
	static navigationSort = 1;

	static async blocks() {
		return [
			CalloutBlock.make()
				.title('Welcome 👋')
				.message('This whole panel is built with KratosJs — including this custom block.')
				.tone('info')
				.columns(12),
		];
	}
}
```

Register the page (and, optionally, the block name) on the panel:

```typescript
adminPanel.pages([DashboardPage]);
adminPanel.registerCustomBlock('callout'); // optional metadata
```

## Runnable example

A complete, working version lives in `examples/sql-app`:

- Backend block: `src/blocks/CalloutBlock.ts`
- React component: `src/admin/components/CalloutBlock.tsx`
- Hosting page: `src/pages/DashboardPage.ts`
- Registration: `src/admin/main.tsx` and `src/index.ts`

Start the app (`npm run dev`) and open the **Dashboard** page to see the custom block render.
