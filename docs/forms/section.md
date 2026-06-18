---
title: Section
---

# Section

The Section component is used as a visual separator to organize form fields into logical groups. It can include an optional heading, icon, description, and can contain nested child components. Sections can be collapsible, displayed as sidebars, and support responsive column layouts.

## Basic Usage

Create a section with a heading. The `make()` method accepts an optional heading parameter:

```typescript
import { Section, TextInput, FileUpload } from '@maxal_studio/kratosjs';

// Option 1: Pass heading directly to make()
Section.make('User Information');

// Option 2: Use the heading() method
Section.make('userInfo').heading('User Information');
```

## Heading

Set the section heading text:

```typescript
Section.make('userInfo').heading('User Information');
```

## Icon

Add an icon to the section header. Icons use Lucide icon names:

```typescript
Section.make('userInfo').heading('User Information').icon('User');
```

## Description

Add a descriptive text below the heading:

```typescript
Section.make('userInfo').heading('User Information').description('Enter your personal information');
```

## Schema (Nested Components)

Add child components to a section using the `schema()` method. This allows you to group related fields within a collapsible section:

```typescript
import { Section, TextInput, FileUpload, SelectInput } from '@maxal_studio/kratosjs';

Section.make('userInfo')
	.heading('User Information')
	.icon('User')
	.collapsible()
	.schema([
		TextInput.make('name').label('Name').required(),
		TextInput.make('email').label('Email').type('email'),
		FileUpload.make('avatar').label('Avatar').image(),
	]);
```

## Columns

Set the number of columns in the section's grid for nested fields. When columns is set, nested fields are laid out in a grid instead of vertically stacked:

```typescript
Section.make('userInfo')
	.heading('User Information')
	.columns(2)
	.schema([
		TextInput.make('firstName').label('First Name'),
		TextInput.make('lastName').label('Last Name'),
		TextInput.make('email').label('Email'),
		TextInput.make('phone').label('Phone'),
	]);
```

## Responsive Columns

Set different column counts for different breakpoints:

```typescript
Section.make('userInfo')
	.heading('User Information')
	.columns({ default: 1, md: 2, lg: 3 })
	.schema([
		TextInput.make('firstName').label('First Name'),
		TextInput.make('lastName').label('Last Name'),
		TextInput.make('email').label('Email'),
		TextInput.make('phone').label('Phone'),
		TextInput.make('address').label('Address'),
		TextInput.make('city').label('City'),
	]);
```

## Collapsible

Make the section collapsible (expandable/collapsible). When collapsible, sections default to collapsed state:

```typescript
Section.make('userInfo').heading('User Information').collapsible();
```

## Collapsed

Control the initial collapsed state. By default, collapsible sections start collapsed. Use `.collapsed(false)` to start expanded:

```typescript
// Start collapsed (default)
Section.make('userInfo').heading('User Information').collapsible().collapsed();

// Start expanded
Section.make('userInfo').heading('User Information').collapsible().collapsed(false);
```

## Compact

Use compact spacing for tighter layout:

```typescript
Section.make('userInfo').heading('User Information').compact();
```

## Aside

Display the section as an aside (sidebar layout). The heading appears on the left, and content on the right:

```typescript
Section.make('userInfo').heading('User Information').aside();
```

## Column Span

Control how many columns the section spans in a multi-column layout:

```typescript
Section.make('userInfo').heading('User Information').columnSpan(2); // Spans 2 columns
```

## Column Span Full

Make the section span the full width of the form:

```typescript
Section.make('userInfo').heading('User Information').columnSpanFull();
```

## Column Start

Set which column the section starts at:

```typescript
Section.make('userInfo').heading('User Information').columnStart(2); // Starts at column 2
```

## Complete Examples

### Basic Section with Nested Fields

```typescript
Section.make('userInfo')
	.heading('User Information')
	.icon('User')
	.description('Enter your personal details')
	.collapsible()
	.schema([
		TextInput.make('firstName').label('First Name').required(),
		TextInput.make('lastName').label('Last Name').required(),
		TextInput.make('email').label('Email').type('email').required(),
		FileUpload.make('avatar').label('Profile Picture').image(),
	]);
```

### Section with Grid Layout

```typescript
Section.make('contactInfo')
	.heading('Contact Information')
	.icon('Phone')
	.columns(2) // 2-column grid layout
	.schema([
		TextInput.make('email').label('Email').type('email').required(),
		TextInput.make('phone').label('Phone').required(),
		TextInput.make('mobile').label('Mobile'),
		TextInput.make('fax').label('Fax'),
	]);
```

### Section with Responsive Columns

```typescript
Section.make('addressInfo')
	.heading('Address')
	.icon('MapPin')
	.columns({ default: 1, md: 2, lg: 3 }) // Responsive: 1 col mobile, 2 cols tablet, 3 cols desktop
	.schema([
		TextInput.make('street').label('Street').required(),
		TextInput.make('city').label('City').required(),
		TextInput.make('state').label('State').required(),
		TextInput.make('zipCode').label('ZIP Code').required(),
		TextInput.make('country').label('Country').required(),
		SelectInput.make('region').label('Region').options({ north: 'North', south: 'South' }),
	]);
```

### Multiple Collapsible Sections

```typescript
[
	Section.make('personalInfo')
		.heading('Personal Information')
		.icon('User')
		.collapsible()
		.schema([TextInput.make('name').label('Name'), TextInput.make('email').label('Email')]),

	Section.make('addressInfo')
		.heading('Address')
		.icon('MapPin')
		.collapsible()
		.schema([
			TextInput.make('street').label('Street'),
			TextInput.make('city').label('City'),
			TextInput.make('zipCode').label('ZIP Code'),
		]),

	Section.make('settings')
		.heading('Settings')
		.icon('Settings')
		.collapsible()
		.collapsed(false) // Start expanded
		.schema([
			Toggle.make('notifications').label('Enable Notifications'),
			SelectInput.make('theme').label('Theme').options({ light: 'Light', dark: 'Dark' }),
		]),
];
```

### Section as Sidebar (Aside)

```typescript
Section.make('sidebar')
	.heading('Additional Information')
	.aside()
	.schema([
		TextInput.make('notes').label('Notes').multiline(),
		FileUpload.make('attachments').label('Attachments').multiple(),
	]);
```

### Section Without Heading (Visual Separator)

Sections without a heading or description act as simple visual separators:

```typescript
// Just a divider line
Section.make();
```

## Notes

- Sections without heading or description render as a simple divider line
- When using `schema()`, child components are rendered inside the section
- When `columns()` is set, nested fields are laid out in a grid; otherwise they stack vertically
- If `columns` is 1 or not set, nested fields use vertical spacing (`space-y-4`)
- Collapsible sections default to collapsed state
- In view mode, sections are always expanded and not collapsible
- Sections can be nested within tabs and other container components
- `columns()` controls the internal grid layout of nested fields, while `columnSpan()` controls how the section itself spans columns in the parent form grid
