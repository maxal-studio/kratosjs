---
title: Custom Widgets
---

# Creating Custom Widgets

KratosJs allows you to create custom widgets to display custom data visualizations or content on dashboards. This involves creating both a backend widget class and a frontend React component — **no plugin required**. You register the component directly on `mountAdminPanel()` in your app's admin entry (`src/admin/main.tsx`).

> To redistribute a widget across apps, package it as a plugin instead — the component contract is identical. See [Custom Components in Plugins](/plugins/custom-components).

## Backend: Creating a Custom Widget Class

### 1. Extend the Widget Class

Create a new TypeScript class that extends `Widget`:

```typescript
// src/widgets/CardWidget.ts
import { Widget, SerializedWidget } from '@maxal_studio/kratosjs';

export interface CardWidgetData {
	title: string;
	description: string;
	imageUrl?: string;
	link?: string;
}

export class CardWidget extends Widget<CardWidgetData[]> {
	protected widgetType = 'card' as const;
	protected _renderFunction?: (em: any, entity: any) => Promise<CardWidgetData[]>;

	/**
	 * Set the render function that returns the widget data
	 */
	render(fn: (em: any, entity: any) => Promise<CardWidgetData[]>): this {
		this._renderFunction = fn;
		return this;
	}

	/**
	 * Execute the render function (called internally by Panel)
	 */
	async execute(em: any, entity: any): Promise<CardWidgetData[]> {
		if (!this._renderFunction) {
			throw new Error(`CardWidget "${this._name}" must have a render function defined`);
		}
		return this._renderFunction(em, entity);
	}

	/**
	 * Serialize to JSON
	 */
	toJSON(): SerializedWidget {
		return {
			...super.toJSON(),
			type: 'card',
		};
	}

	/**
	 * Factory method
	 */
	static make(name: string): CardWidget {
		return new CardWidget(name);
	}
}
```

### 2. Using Your Custom Widget

Use your custom widget in resource definitions:

```typescript
import { CardWidget } from '../widgets/CardWidget';

static widgets() {
	return [
		CardWidget.make('featuredPosts')
			.label('Featured Posts')
			.icon('Star')
			.render(async (em, entity) => {
				const posts = await em.find(entity, { featured: true }, { limit: 3 });
				return posts.map((post: any) => ({
					title: post.title,
					description: post.excerpt,
					imageUrl: post.imageUrl,
					link: `/posts/${post.slug}`,
				}));
			}),
	];
}
```

## Frontend: Creating a React Component

### 1. Create the React Component

Create a React component that handles the widget rendering:

```typescript
// src/components/CardWidget.tsx
import React from 'react';
import { WidgetComponentProps } from '@maxal_studio/kratosjs-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';

interface CardWidgetData {
	title: string;
	description: string;
	imageUrl?: string;
	link?: string;
}

export function CardWidget({ widget, data }: WidgetComponentProps) {
	const cards = (data as CardWidgetData[]) || [];

	if (cards.length === 0) {
		return (
			<div className="p-4 text-center text-gray-500">
				<p>No cards to display</p>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{cards.map((card, index) => (
				<Card key={index} className="overflow-hidden">
					{card.imageUrl && (
						<img src={card.imageUrl} alt={card.title} className="w-full h-48 object-cover" />
					)}
					<CardHeader>
						<CardTitle className="flex items-center justify-between">
							{card.title}
							{card.link && (
								<a
									href={card.link}
									target="_blank"
									rel="noopener noreferrer"
									className="text-blue-500 hover:text-blue-700"
								>
									<ExternalLink className="w-4 h-4" />
								</a>
							)}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<CardDescription>{card.description}</CardDescription>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
```

### 2. Register Your Custom Widget

Register your component on `mountAdminPanel()` in your app's admin entry. The key must match the widget's `type`:

```typescript
// src/admin/main.tsx
import { mountAdminPanel } from '@maxal_studio/kratosjs-react';
import '@maxal_studio/kratosjs-react/styles.css';
import { CardWidget } from './components/CardWidget';

mountAdminPanel({
	widgets: {
		card: CardWidget, // ✅ key matches the widget type
	},
});
```

> **Optional metadata** — the backend can also call `panel.registerCustomWidget('card')` so the type name appears in panel metadata. This is informational only; rendering is driven by the `widgets` registry.

## Complete Example

### Backend Widget Class

```typescript
// src/widgets/ListWidget.ts
import { Widget, SerializedWidget } from '@maxal_studio/kratosjs';

export interface ListItem {
	id: string;
	title: string;
	subtitle?: string;
	icon?: string;
	badge?: string;
	badgeColor?: string;
	action?: {
		label: string;
		url: string;
	};
}

export class ListWidget extends Widget<ListItem[]> {
	protected widgetType = 'list' as const;
	protected _renderFunction?: (em: any, entity: any) => Promise<ListItem[]>;
	protected _maxItems?: number;
	protected _showActions: boolean = true;

	maxItems(max: number): this {
		this._maxItems = max;
		return this;
	}

	showActions(show: boolean = true): this {
		this._showActions = show;
		return this;
	}

	render(fn: (em: any, entity: any) => Promise<ListItem[]>): this {
		this._renderFunction = fn;
		return this;
	}

	async execute(em: any, entity: any): Promise<ListItem[]> {
		if (!this._renderFunction) {
			throw new Error(`ListWidget "${this._name}" must have a render function defined`);
		}
		const items = await this._renderFunction(em, entity);
		return this._maxItems ? items.slice(0, this._maxItems) : items;
	}

	toJSON(): SerializedWidget {
		return {
			...super.toJSON(),
			type: 'list',
			maxItems: this._maxItems,
			showActions: this._showActions,
		};
	}

	static make(name: string): ListWidget {
		return new ListWidget(name);
	}
}
```

### Frontend Component

```typescript
// src/components/ListWidget.tsx
import React from 'react';
import { WidgetComponentProps } from '@maxal_studio/kratosjs-react';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface ListItem {
	id: string;
	title: string;
	subtitle?: string;
	icon?: string;
	badge?: string;
	badgeColor?: string;
	action?: {
		label: string;
		url: string;
	};
}

const iconMap: Record<string, React.ComponentType<any>> = {
	check: CheckCircle2,
	alert: AlertCircle,
	clock: Clock,
};

export function ListWidget({ widget, data }: WidgetComponentProps) {
	const items = (data as ListItem[]) || [];
	const showActions = (widget as any).showActions !== false;

	if (items.length === 0) {
		return (
			<div className="p-4 text-center text-gray-500">
				<p>No items to display</p>
			</div>
		);
	}

	return (
		<div className="space-y-2">
			{items.map(item => {
				const IconComponent = item.icon ? iconMap[item.icon] : null;
				return (
					<div
						key={item.id}
						className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
					>
						<div className="flex items-center gap-3 flex-1">
							{item.icon && IconComponent && (
								<IconComponent className="w-5 h-5 text-gray-400" />
							)}
							<div className="flex-1">
								<p className="text-sm font-medium text-gray-900">{item.title}</p>
								{item.subtitle && <p className="text-xs text-gray-500">{item.subtitle}</p>}
							</div>
							{item.badge && (
								<span
									className={`px-2 py-1 text-xs font-medium rounded-full ${
										item.badgeColor === 'green'
											? 'bg-green-100 text-green-800'
											: item.badgeColor === 'red'
											? 'bg-red-100 text-red-800'
											: 'bg-gray-100 text-gray-800'
									}`}
								>
									{item.badge}
								</span>
							)}
						</div>
						{showActions && item.action && (
							<a
								href={item.action.url}
								className="ml-4 text-sm text-blue-600 hover:text-blue-800"
							>
								{item.action.label}
							</a>
						)}
					</div>
				);
			})}
		</div>
	);
}
```

### Registration

```typescript
// src/admin/main.tsx
import { mountAdminPanel } from '@maxal_studio/kratosjs-react';
import '@maxal_studio/kratosjs-react/styles.css';
import { ListWidget } from './components/ListWidget';

mountAdminPanel({
	widgets: {
		list: ListWidget,
	},
});
```

## Widget Props Interface

Your custom widget component will receive these props:

```typescript
interface WidgetComponentProps {
	widget: SerializedWidget; // The serialized widget schema
	data: any; // The data returned from the widget's execute() method
}
```

## Using Custom Widgets in Resources

```typescript
import { ListWidget } from '../widgets/ListWidget';

static widgets() {
	return [
		ListWidget.make('recentTasks')
			.label('Recent Tasks')
			.icon('List')
			.maxItems(5)
			.showActions()
			.render(async (em, entity) => {
				const tasks = await em.find(entity, { completed: false }, {
					orderBy: { createdAt: 'DESC' },
					limit: 5,
				});
				return tasks.map((task: any) => ({
					id: task.id,
					title: task.title,
					subtitle: `Due: ${task.dueDate?.toLocaleDateString()}`,
					icon: task.priority === 'high' ? 'alert' : 'clock',
					badge: task.priority,
					badgeColor: task.priority === 'high' ? 'red' : 'gray',
					action: {
						label: 'View',
						url: `/tasks/${task._id}`,
					},
				}));
			}),
	];
}
```

## Best Practices

1. **Define clear data interfaces**: Use TypeScript interfaces for your widget's data structure.
2. **Handle loading states**: Consider showing loading indicators while data is being fetched.
3. **Error handling**: Display error messages if the widget's execute function fails.
4. **Empty states**: Provide meaningful empty states when no data is available.
5. **Responsive design**: Ensure your widgets work well on different screen sizes.
6. **Performance**: Optimize rendering for widgets that display large amounts of data.
