---
title: Overview
---

# Pages

Pages are custom pages in your admin panel that can display any content you want. They're perfect for dashboards, settings pages, or any custom functionality.

## Creating a Page

To create a page, extend the `Page` class:

```typescript
import { Page } from '@maxal_studio/kratosjs';

export class DashboardPage extends Page {
	static slug = 'dashboard';
	static label = 'Dashboard';
	static icon = 'LayoutDashboard';
	static navigationSort = 1;
	static hidden = false;
	static excluded = false;
}
```

## Page Properties

- **`slug`**: The URL slug for the page (e.g., `'dashboard'` creates route at `/dashboard`)
- **`label`**: Display label in navigation
- **`icon`**: Lucide icon name
- **`navigationSort`**: Control the order in navigation
- **`navigationGroup`**: Group pages in the sidebar
- **`hidden`**: Hides the page from the Sidebar, but can be accessed via url
- **`excluded`**: When true, the page will not have routes registered in the React app

## Page Blocks

Pages are built using blocks. A block is a reusable component that can display different types of content:

- **`WidgetBlock`**: Display widgets (stats, charts)
- **`TableBlock`**: Display tables
- **`FormBlock`**: Display forms
- **`TabsBlock`**: Display content in tabs

## Basic Page Example

```typescript
import { Page, WidgetBlock, TableBlock, TableBuilder, TextColumn } from '@maxal_studio/kratosjs';

export class DashboardPage extends Page {
	static slug = 'dashboard';
	static label = 'Dashboard';
	static icon = 'LayoutDashboard';
	static navigationSort = 1;

	static async blocks() {
		// Get widgets from resources
		const userWidgets = UserResource.widgets();

		const blocks = [];

		// Add widgets
		if (userWidgets) {
			userWidgets.forEach(widget => {
				blocks.push(WidgetBlock.make(widget).columns(3));
			});
		}

		// Add a table
		const table = TableBuilder.make().columns([
			TextColumn.make('name').label('Name'),
			TextColumn.make('email').label('Email'),
		]);

		blocks.push(TableBlock.make(table).title('Recent Users').dataUrl('dashboard/recent-users').columns(6));

		return blocks;
	}
}
```

## Request Context

Use `this.getContext()` inside `blocks()` to get the current request context:

- **`user`**: Current authenticated user
- **`query`**: URL query parameters
- **`body`**: Request body (if available)
- **`headers`**: Request headers
- **`resolveMediaUrl`**: Helper to resolve media URLs

```typescript
static async blocks() {
  const context = this.getContext();
  const userId = context?.user?.id;
  const searchQuery = context?.query?.search;

  // Use context to customize blocks
  return blocks;
}
```

## Registering Pages

After creating a page, register it with the panel:

```typescript
adminPanel.pages([DashboardPage, ProfilePage]);
```

## Next Steps

- [Creating Pages](/pages/creating-pages) - Detailed guide on creating pages
- [Blocks](/pages/blocks) - Learn about different block types
