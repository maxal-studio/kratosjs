---
title: Custom Filter
---

# Custom Filter (`CustomFilter`)

The `CustomFilter` allows you to define your own custom filter component. This is useful when you need filtering functionality that isn't covered by the built-in filter types.

```typescript
import { CustomFilter } from '@maxal_studio/kratosjs';

CustomFilter.make('customFilter')
	.label('Custom Filter')
	.component('MyCustomFilterComponent')
	.componentProps({
		options: ['option1', 'option2'],
		placeholder: 'Select...',
	});
```

## Available Options

- `make(name: string)`: Creates a new `CustomFilter` instance.
- `label(text: Resolvable<string>)`: Sets the filter label.
- `component(component: string)`: Sets the custom React component name to render.
- `componentProps(props: Record<string, any>)`: Sets props to pass to the custom component.

## Usage

Define a custom filter with your own React component:

```typescript
import { TableBuilder, CustomFilter } from '@maxal_studio/kratosjs';

TableBuilder.make()
	.columns([...])
	.filters([
		CustomFilter.make('advancedSearch')
			.label('Advanced Search')
			.component('AdvancedSearchFilter')
			.componentProps({
				fields: ['name', 'email', 'phone'],
				placeholder: 'Search...',
			}),
	]);
```

## Frontend Implementation

On the frontend, you'll need to register your custom filter component. The component will receive:

- `filter`: The filter schema
- `value`: The current filter value
- `onChange`: Function to update the filter value

```typescript
// Example custom filter component
function MyCustomFilterComponent({ filter, value, onChange }) {
	// Your custom filter UI
	return (
		<div>
			{/* Custom filter controls */}
		</div>
	);
}
```

## Complete Example

```typescript
CustomFilter.make('locationFilter')
	.label('Location')
	.component('LocationFilterComponent')
	.componentProps({
		regions: ['North', 'South', 'East', 'West'],
		showRadius: true,
		defaultRadius: 10,
	});
```
