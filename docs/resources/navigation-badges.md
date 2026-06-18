---
title: Navigation Badges
---

# Navigation Badges

You can show a **badge** (e.g. a count or label) next to a resource or page in the sidebar. Badges are loaded from the **GET /meta/badges** endpoint and can include an optional **color**.

## Defining a badge on a resource

Implement the optional static method **`getNavigationBadge()`** on your resource class. It can be async and has access to the request context via `getRequestContext()` from `RequestContextStorage`. Return an object with **`value`** (string or number) and optional **`color`**, or `null` to hide the badge.

### Return type

- **`value`**: The text or number shown in the badge (e.g. a count, or a label like `"New"`).
- **`color`** (optional): Either a semantic name or a CSS color.
    - Semantic names: `'blue'`, `'green'`, `'red'`, `'yellow'`, `'gray'` (mapped to Tailwind styles in the frontend).
    - Or any CSS color (e.g. `'#3b82f6'`, `'rgb(59, 130, 246)'`) for custom styling.

### Example: count of active users

```typescript
import { BaseResource, type NavigationBadge } from '@maxal_studio/kratosjs';
import { User } from '../entities/User';

export class UserResource extends BaseResource {
	static slug = 'users';
	static entity = User;
	static label = 'User';
	static pluralLabel = 'Users';
	static icon = 'Users';
	static navigationGroup = 'User Management';
	static navigationSort = 1;

	/**
	 * Navigation badge: count of active users with optional color
	 */
	static async getNavigationBadge(): Promise<NavigationBadge | null> {
		const em = this.getPanel().getEm();
		const value = await em.count(this.entity, { active: true });
		return { value, color: 'blue' };
	}

	// ... form(), table(), etc.
}
```

The sidebar will show the badge to the right of the resource label (e.g. **Users** with a blue pill showing the count).

### Example: custom color

```typescript
static async getNavigationBadge(): Promise<NavigationBadge | null> {
	const em = this.getPanel().getEm();
	const count = await em.count(this.entity, { status: 'pending' });
	if (count === 0) return null;
	return { value: count, color: 'red' };  // or color: '#ef4444'
}
```

### Example: text label instead of a number

```typescript
static async getNavigationBadge(): Promise<NavigationBadge | null> {
	const em = this.getPanel().getEm();
	const count = await em.count(this.entity, { seen: false });
	return count > 0 ? { value: 'New', color: 'green' } : null;
}
```

## Pages

Pages support the same API. Add **`getNavigationBadge()`** to your page class:

```typescript
import { Page, type NavigationBadge } from '@maxal_studio/kratosjs';

export class DashboardPage extends Page {
	static slug = 'dashboard';
	static label = 'Dashboard';
	static icon = 'LayoutDashboard';

	static async getNavigationBadge(): Promise<NavigationBadge | null> {
		// e.g. fetch count from API or getRequestContext()
		return { value: 3, color: 'yellow' };
	}

	static async blocks() {
		return [
			/* ... */
		];
	}
}
```

## How badges are loaded

- **Initial load**: The admin panel fetches **/meta** and **/meta/badges** in parallel, then merges badge values (and colors) into the sidebar data.
- **Refresh**: After create, update, delete, or an action that returns `refreshBadges: true`, the frontend refetches **/meta/badges** and updates the sidebar. You can also trigger a refresh by having the server send the **`X-KratosJs-Refresh-Badges`** response header.

No changes are required on the frontend for a new resource or page badge; defining **`getNavigationBadge()`** on the backend is enough.

## Type import

Use the **`NavigationBadge`** type for the return type of `getNavigationBadge()`:

```typescript
import type { NavigationBadge } from '@maxal_studio/kratosjs';

static async getNavigationBadge(): Promise<NavigationBadge | null> {
	// ...
}
```

## Summary

| Item        | Description                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------------- |
| **Method**  | Optional `static getNavigationBadge?(): Promise<NavigationBadge \| null \| undefined>`         |
| **Return**  | `{ value: string \| number; color?: string }` or `null`                                        |
| **Color**   | Semantic: `'blue'`, `'green'`, `'red'`, `'yellow'`, `'gray'` — or any CSS color                |
| **Context** | Use `getRequestContext()` from `RequestContextStorage` if you need the current user or request |
