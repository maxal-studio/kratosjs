---
title: Creating Pages
---

# Creating Pages

This guide will walk you through creating custom pages with different types of blocks.

## Page with Widgets

```typescript
import { Page, WidgetBlock } from '@maxal_studio/kratosjs';
import { UserResource } from '../resources/UserResource';

export class DashboardPage extends Page {
	static slug = 'dashboard';
	static label = 'Dashboard';
	static icon = 'LayoutDashboard';
	static navigationSort = 1;
	static hidden = false;
	static excluded = false;

	static async blocks() {
		const userWidgets = UserResource.widgets();
		const blocks = [];

		if (userWidgets) {
			userWidgets.forEach(widget => {
				blocks.push(WidgetBlock.make(widget).columns(3));
			});
		}

		return blocks;
	}
}
```

## Page with Tables

```typescript
import { Page, TableBlock, TableBuilder, TextColumn } from '@maxal_studio/kratosjs';

export class DashboardPage extends Page {
	static slug = 'dashboard';
	static label = 'Dashboard';
	static icon = 'LayoutDashboard';

	static async blocks() {
		const table = TableBuilder.make()
			.columns([
				TextColumn.make('name').label('Name').sortable(),
				TextColumn.make('email').label('Email').sortable(),
			])
			.paginate(10);

		return [
			TableBlock.make(table)
				.title('Recent Users')
				.subtitle('Last 10 registered users')
				.dataUrl('dashboard/recent-users')
				.columns(6),
		];
	}
}
```

## Page with Forms

```typescript
import { Page, FormBlock, FormBuilder, TextInput } from '@maxal_studio/kratosjs';

export class ProfilePage extends Page {
	static slug = 'profile';
	static label = 'Profile';
	static icon = 'User';

	static async blocks() {
		const context = this.getContext();
		const userId = context?.user?.id;
		const em = this.getPanel().getEm();
		const user = await em.findOne('User', { id: userId });

		const form = FormBuilder.make().schema([
			TextInput.make('name').label('Name').default(user?.name),
			TextInput.make('email').label('Email').default(user?.email),
		]);

		return [FormBlock.make(form).title('Edit Profile').submitUrl('profile/update')];
	}
}
```

## Page with Tabs

```typescript
import { Page, TabsBlock, FormBlock, FormBuilder, TextInput } from '@maxal_studio/kratosjs';

export class ProfilePage extends Page {
	static slug = 'profile';
	static label = 'Profile';
	static icon = 'User';

	static async blocks() {
		const profileForm = FormBuilder.make().schema([
			TextInput.make('name').label('Name'),
			TextInput.make('email').label('Email'),
		]);

		const passwordForm = FormBuilder.make().schema([
			TextInput.make('newPassword').label('New Password').type('password'),
			TextInput.make('confirmPassword').label('Confirm Password').type('password'),
		]);

		return [
			TabsBlock.make()
				.tab('Basic Info', [FormBlock.make(profileForm).submitUrl('profile/update')], 'User')
				.tab('Change Password', [FormBlock.make(passwordForm).submitUrl('profile/change-password')], 'Lock')
				.defaultTab(0),
		];
	}
}
```

## Page with Multiple Blocks

```typescript
import {
	Page,
	WidgetBlock,
	TableBlock,
	FormBlock,
	TableBuilder,
	FormBuilder,
	TextColumn,
	TextInput,
} from '@maxal_studio/kratosjs';

export class DashboardPage extends Page {
	static slug = 'dashboard';
	static label = 'Dashboard';
	static icon = 'LayoutDashboard';

	static async blocks() {
		const blocks = [];

		// Add widgets
		const widgets = UserResource.widgets();
		if (widgets) {
			widgets.forEach(widget => {
				blocks.push(WidgetBlock.make(widget).columns(3));
			});
		}

		// Add table
		const table = TableBuilder.make().columns([TextColumn.make('name').label('Name')]);

		blocks.push(TableBlock.make(table).title('Recent Users').dataUrl('dashboard/recent-users').columns(6));

		// Add form
		const form = FormBuilder.make().schema([TextInput.make('search').label('Search')]);

		blocks.push(FormBlock.make(form).title('Quick Search').submitUrl('dashboard/search').columns(6));

		return blocks;
	}
}
```

## Block Columns

Blocks can span different numbers of columns (out of 12):

```typescript
WidgetBlock.make(widget).columns(3); // 3/12 = 25% width
TableBlock.make(table).columns(6); // 6/12 = 50% width
FormBlock.make(form).columns(12); // 12/12 = 100% width
```

## Block Titles and Subtitles

Blocks can have titles and subtitles:

```typescript
TableBlock.make(table).title('Recent Users').subtitle('Last 10 registered users').columns(6);
```

## Custom Routes for Pages

For pages that need custom API endpoints, you can create routes:

```typescript
// In your backend index.ts
app.post(
	adminPanel.getBasePath() + '/dashboard/recent-users',
	adminPanel.attachAuth(),
	adminPanel.attachMediaHelpers(),
	async (req, res) => {
		// Handle the request
		const users = await User.find().limit(10);
		res.json({ data: users });
	},
);
```

## Next Steps

- [Blocks](/pages/blocks) - Learn about different block types in detail
