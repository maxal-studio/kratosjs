---
title: Tabs
---

# Tabs

The Tabs component organizes form fields into tabbed interfaces. Each tab has its own label, optional icon, and schema of nested components. Tabs are useful for organizing complex forms into logical sections that users can navigate between.

## Basic Usage

Create a tabs component with multiple tabs:

```typescript
import { Tabs, TextInput, SelectInput } from '@maxal_studio/kratosjs';

Tabs.make().tabs([
	{
		label: 'Personal Info',
		schema: [
			TextInput.make('firstName').label('First Name').required(),
			TextInput.make('lastName').label('Last Name').required(),
		],
	},
	{
		label: 'Contact Info',
		schema: [
			TextInput.make('email').label('Email').type('email').required(),
			TextInput.make('phone').label('Phone'),
		],
	},
]);
```

## Tab Definition

Each tab in the `tabs()` array is an object with:

- `label` (required): The tab label text
- `icon` (optional): Lucide icon name to display in the tab header
- `schema` (required): Array of form components to render in this tab

```typescript
{
	label: 'Tab Name',
	icon: 'User', // Optional
	schema: [
		// Your form components here
	],
}
```

## Icons

Add icons to tab headers using Lucide icon names:

```typescript
Tabs.make().tabs([
	{
		label: 'Personal',
		icon: 'User',
		schema: [TextInput.make('name').label('Name')],
	},
	{
		label: 'Contact',
		icon: 'Phone',
		schema: [TextInput.make('email').label('Email')],
	},
	{
		label: 'Address',
		icon: 'MapPin',
		schema: [TextInput.make('address').label('Address')],
	},
]);
```

## Default Tab

Set which tab should be active by default:

```typescript
Tabs.make()
	.defaultTab(1) // Second tab (0-indexed)
	.tabs([
		{ label: 'Tab 1', schema: [...] },
		{ label: 'Tab 2', schema: [...] },
		{ label: 'Tab 3', schema: [...] },
	]);
```

## Columns

Set the number of columns for the grid layout of nested fields within tabs:

```typescript
Tabs.make()
	.columns(2)
	.tabs([
		{
			label: 'Personal Info',
			schema: [
				TextInput.make('firstName').label('First Name'),
				TextInput.make('lastName').label('Last Name'),
				TextInput.make('email').label('Email'),
				TextInput.make('phone').label('Phone'),
			],
		},
	]);
```

## Responsive Columns

Set different column counts for different breakpoints:

```typescript
Tabs.make()
	.columns({ default: 1, md: 2, lg: 3 })
	.tabs([
		{
			label: 'Information',
			schema: [
				TextInput.make('field1').label('Field 1'),
				TextInput.make('field2').label('Field 2'),
				TextInput.make('field3').label('Field 3'),
				TextInput.make('field4').label('Field 4'),
				TextInput.make('field5').label('Field 5'),
				TextInput.make('field6').label('Field 6'),
			],
		},
	]);
```

## Description

Add a description that appears above the tabs:

```typescript
Tabs.make()
	.description('Please fill out all required fields in each tab')
	.tabs([
		{ label: 'Tab 1', schema: [...] },
		{ label: 'Tab 2', schema: [...] },
	]);
```

## Column Span

Control how many columns the tabs component spans in a multi-column form layout:

```typescript
Tabs.make()
	.columnSpan(2) // Spans 2 columns
	.tabs([...]);
```

## Column Span Full

Make the tabs component span the full width of the form:

```typescript
Tabs.make()
	.columnSpanFull()
	.tabs([...]);
```

## Column Start

Set which column the tabs component starts at:

```typescript
Tabs.make()
	.columnStart(2) // Starts at column 2
	.tabs([...]);
```

## Validation Error Handling

The Tabs component automatically handles validation errors:

- **Auto-opening**: If a tab contains fields with validation errors, that tab will automatically open
- **Visual indicators**: Tab headers with errors display a red dot indicator
- **Required fields**: If required fields are in a hidden tab, the tab will automatically open to show the errors

This ensures users can always see and fix validation errors, even if they're in tabs that aren't currently visible.

## Complete Examples

### Basic Tabs with Multiple Sections

```typescript
Tabs.make().tabs([
	{
		label: 'Personal Information',
		icon: 'User',
		schema: [
			TextInput.make('firstName').label('First Name').required(),
			TextInput.make('lastName').label('Last Name').required(),
			TextInput.make('dateOfBirth').label('Date of Birth').type('date'),
		],
	},
	{
		label: 'Contact Information',
		icon: 'Phone',
		schema: [
			TextInput.make('email').label('Email').type('email').required(),
			TextInput.make('phone').label('Phone').required(),
			TextInput.make('address').label('Address'),
		],
	},
	{
		label: 'Preferences',
		icon: 'Settings',
		schema: [
			Toggle.make('newsletter').label('Subscribe to Newsletter'),
			SelectInput.make('language').label('Language').options({
				en: 'English',
				es: 'Spanish',
				fr: 'French',
			}),
		],
	},
]);
```

### Tabs with Grid Layout

```typescript
Tabs.make()
	.columns(2)
	.tabs([
		{
			label: 'Basic Info',
			schema: [
				TextInput.make('firstName').label('First Name'),
				TextInput.make('lastName').label('Last Name'),
				TextInput.make('email').label('Email'),
				TextInput.make('phone').label('Phone'),
			],
		},
		{
			label: 'Additional Info',
			schema: [
				Textarea.make('bio').label('Biography'),
				FileUpload.make('avatar').label('Profile Picture').image(),
			],
		},
	]);
```

### Tabs with Nested Components

Tabs can contain any form components, including Sections, Groups, and even nested Tabs:

```typescript
Tabs.make().tabs([
	{
		label: 'User Details',
		schema: [
			Section.make('personalInfo')
				.heading('Personal Information')
				.schema([
					TextInput.make('name').label('Name').required(),
					TextInput.make('email').label('Email').required(),
				]),
			Group.make([
				TextInput.make('phone').label('Phone'),
				TextInput.make('mobile').label('Mobile'),
			])
				.label('Contact Numbers')
				.columns(2),
		},
		{
			label: 'Settings',
			schema: [
				Toggle.make('notifications').label('Enable Notifications'),
				SelectInput.make('theme').label('Theme').options({
					light: 'Light',
					dark: 'Dark',
				}),
			],
		},
]);
```

### Complex Form with Tabs

```typescript
FormBuilder.make().schema([
	TextInput.make('title').label('Title').required(),

	Tabs.make()
		.description('Complete all sections below')
		.defaultTab(0)
		.tabs([
			{
				label: 'General',
				icon: 'FileText',
				schema: [
					Textarea.make('description').label('Description'),
					SelectInput.make('category').label('Category').options({
						tech: 'Technology',
						design: 'Design',
						business: 'Business',
					}),
				],
			},
			{
				label: 'Media',
				icon: 'Image',
				schema: [
					FileUpload.make('coverImage').label('Cover Image').image(),
					FileUpload.make('gallery').label('Gallery').image().multiple(),
				],
			},
			{
				label: 'Advanced',
				icon: 'Settings',
				schema: [
					Toggle.make('featured').label('Featured'),
					DateTimePicker.make('publishDate').label('Publish Date'),
					ColorPicker.make('accentColor').label('Accent Color'),
				],
			},
		]),

	Textarea.make('notes').label('Notes'),
]);
```

## Notes

- Tabs are automatically opened if they contain fields with validation errors
- Tab headers with errors display a red dot indicator
- In view mode, all tabs are displayed (not interactive)
- Tabs support all nested components including Sections, Groups, and Repeaters
- The `columns()` method controls the internal grid layout of nested fields within tabs
- The `columnSpan()` method controls how the tabs component itself spans columns in the parent form grid
- Tabs can be nested within Sections and Groups
