---
title: Slots
---

# Slots

Slots are named injection points in the admin panel chrome where you — or a plugin — can render your own React elements. They are the additive counterpart to the [component registries](/forms/custom-fields): a registry **replaces** the component for a schema-driven type (one component wins), while a slot lets **many** contributors stack extra elements into a fixed location such as the header, the table toolbar, a form footer, or the detail modal.

Slots are a frontend-only concern. You register contributions from `mountAdminPanel({ slots })` in your app, or from a plugin's client manifest — no backend changes are required.

## How slots differ from registries

|             | Registries (`fields`, `columns`, `widgets`, `blocks`) | Slots                                                   |
| ----------- | ----------------------------------------------------- | ------------------------------------------------------- |
| Cardinality | 1:1 — one component per type key                      | 1:many — many contributions per slot                    |
| Merge       | Override (app wins over plugins)                      | Concatenate (everyone stacks)                           |
| Driven by   | Backend schema referencing the type                   | A fixed `<Slot>` location in the UI                     |
| Typical use | "Render my component for `star-rating` cells"         | "Add a button to the header / a banner above the table" |

## Adding a slot from `mountAdminPanel`

A contribution is an object `{ id, render, order? }`. `render` is a React component (or a function) that receives the slot's [context](#slot-context). `id` is a stable key; `order` controls position (lower first, default `0`).

```tsx
// src/admin/main.tsx
import { mountAdminPanel } from '@maxal_studio/kratosjs-react';
import '@maxal_studio/kratosjs-react/styles.css';
import { HelpCircle } from '@maxal_studio/kratosjs-react'; // re-exported lucide icons

mountAdminPanel({
	slots: {
		'header.right': {
			id: 'help-link',
			render: () => (
				<a href="/docs" className="inline-flex items-center gap-1 text-sm text-fg-secondary hover:text-fg">
					<HelpCircle className="h-4 w-4" /> Help
				</a>
			),
		},
		// An array, or multiple contributions, are both fine:
		'panel.footer': [
			{ id: 'copyright', render: () => <span className="text-xs text-fg-muted">© 2026 Acme</span> },
			{ id: 'version', order: 10, render: () => <span className="text-xs text-fg-muted">v1.2.3</span> },
		],
	},
});
```

## Adding a slot from a plugin

A plugin contributes slots through its client manifest. Plugin and app contributions to the same slot all render — apps simply come last.

```tsx
// my-plugin/src/client/index.ts
import { definePluginClient } from '@maxal_studio/kratosjs-react';
import { AuditBanner } from './AuditBanner';

export default definePluginClient({
	name: 'audit',
	slots: {
		'detail.afterDetails': {
			id: 'audit-trail',
			render: ({ resourceSlug, record }) => <AuditBanner resourceSlug={resourceSlug} record={record} />,
		},
	},
});
```

```tsx
// app: mountAdminPanel({ plugins: [auditPlugin] });
```

### Defining your own slot

Slot names are open strings, so a plugin (or your app) can render its own `<Slot>` inside a custom block, page, or widget and let other contributors target it:

```tsx
import { Slot } from '@maxal_studio/kratosjs-react';

export function MyCustomBlock() {
	return (
		<div>
			{/* ...your block... */}
			<Slot name="audit.blockFooter" as="div" className="mt-2" />
		</div>
	);
}
```

## The `SlotContribution` API

```ts
interface SlotContribution<C extends SlotContext = SlotContext> {
	/** Stable id — used as the React key and to dedupe across contributors. */
	id: string;
	/** A React component, or a (ctx) => ReactNode function. Receives the slot context. */
	render: ComponentType<C> | ((ctx: C) => ReactNode);
	/** Lower renders first. Defaults to 0; ties keep registration order. */
	order?: number;
}
```

Each contribution is rendered inside an [error boundary](/), so a crash in one slot element never takes down the panel — the rest of the slot (and page) keep working.

## Slot context

Every `render` receives a `SlotContext`. The base fields are always present; each location widens it with what it can supply:

```ts
interface SlotContext {
	slot: SlotName; // the slot being rendered
	resourceSlug?: string; // resource in scope (table/form/detail)
	schema?: unknown; // resource/page schema in scope
	record?: Record<string, unknown>; // the record (detail/form)
	location?: string; // current pathname
	user?: unknown; // authenticated user (header/userMenu)
}
```

## Built-in slots

| Slot name             | Where it renders                              | Context provided                                                   | Responsive    |
| --------------------- | --------------------------------------------- | ------------------------------------------------------------------ | ------------- |
| `header.left`         | Top bar, next to the page title               | `user`                                                             | inline        |
| `header.right`        | Top bar, with the search & theme controls     | `user`                                                             | **collapses** |
| `header.userMenu`     | Account dropdown, above "Sign out"            | `user`                                                             | menu rows     |
| `sidebar.brand`       | Sidebar header, next to the logo              | —                                                                  | 248px column  |
| `sidebar.top`         | Sidebar, above the navigation                 | `location`                                                         | 248px column  |
| `sidebar.bottom`      | Sidebar, pinned below the navigation          | `location`                                                         | 248px column  |
| `panel.footer`        | Global footer below every page                | —                                                                  | full width    |
| `table.toolbar`       | Table toolbar, with the action buttons        | `schema`                                                           | **collapses** |
| `table.aboveTable`    | Above the table card                          | `schema`, `resourceSlug`                                           | full width    |
| `table.belowTable`    | Below the table card                          | `schema`, `resourceSlug`                                           | full width    |
| `table.bulkActions`   | Bulk-action bar (only when rows are selected) | `schema`, `resourceSlug`, `data.selectedIds`, `data.selectedCount` | wraps         |
| `table.rowActions`    | Each row's action cell                        | `schema`, `record`, `data.rowId`, `data.rowIndex`                  | inline        |
| `form.header`         | Above the form fields                         | `resourceSlug`, `record`, `schema`                                 | full width    |
| `form.footer`         | The form's submit/reset row                   | `resourceSlug`, `record`, `schema`                                 | wraps         |
| `detail.actions`      | View modal action bar                         | `resourceSlug`, `record`                                           | wraps         |
| `detail.tabs`         | View modal tab strip (end)                    | `data.activeTab`, `data.setActiveTab`                              | scrolls       |
| `detail.afterDetails` | View modal, below the record details          | `resourceSlug`, `record`                                           | full width    |
| `page.top`            | Page, above the blocks                        | `schema`, `location`                                               | full width    |
| `page.bottom`         | Page, below the blocks                        | `schema`, `location`                                               | full width    |
| `widgets.append`      | End of the dashboard widget grid              | —                                                                  | grid cell     |
| `modal.headerActions` | Any drawer/modal header, right cluster        | —                                                                  | inline        |
| `modal.footer`        | Any drawer/modal pinned footer                | —                                                                  | full width    |
| `login.top`           | Login screen, above the form card             | —                                                                  | card width    |
| `login.belowForm`     | Login screen, below the form                  | —                                                                  | card width    |

Use the exported `SLOT_NAMES` constant for autocomplete:

```ts
import { SLOT_NAMES } from '@maxal_studio/kratosjs-react';
// SLOT_NAMES.headerRight === 'header.right'
```

## Mobile & overflow

The two horizontally tight areas — `header.right` and `table.toolbar` — render through `SlotCluster`, which **auto-collapses** on small screens: the first couple of items stay inline on `sm`+ and the rest fold into a "…" menu; below `sm` everything folds into the menu. This means a crowded slot can never overflow a phone-width row, no matter how many plugins contribute.

For the other slots, keep mobile in mind:

- Prefer compact, icon-first elements in `header.left` and the sidebar (the sidebar is a 248px drawer on mobile).
- Slot wrappers use `flex`, `gap`, and `empty:hidden`, so an empty slot adds no chrome.
- Avoid fixed pixel widths; let your element shrink.

## Best practices

1. **Stable `id`s** — they are the React key and the dedupe handle across plugins.
2. **Use the context** — read `resourceSlug` / `record` rather than re-fetching; slot elements render inside the panel's providers, so hooks like `useTranslation`, `useAuth`, and `useResourceModal` are available.
3. **Order intentionally** — set `order` when position matters; otherwise contributions appear in registration order (plugins first, app last).
4. **Keep it light** — slots are chrome, not pages. Heavy content belongs in a custom [page](/pages/overview) or [block](/pages/custom-blocks).
5. **Style with tokens** — use the panel's CSS tokens (`text-fg`, `bg-surface`, `border-border`, …) so your element matches light/dark themes.
