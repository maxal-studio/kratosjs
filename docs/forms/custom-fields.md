---
title: Custom Fields
---

# Creating Custom Form Fields

KratosJs allows you to create custom form fields to extend the built-in field types. This involves creating both a backend field class and a frontend React component.

## Backend: Creating a Custom Field Class

### 1. Extend the Field Class

Create a new TypeScript class that extends `Field`:

```typescript
// src/fields/PhoneNumberField.ts
import { Field } from '@maxal_studio/kratosjs';
import { SerializedComponent } from '@maxal_studio/kratosjs';

export class PhoneNumberField extends Field {
	protected componentType: string = 'phone-number';
	protected _countryCode?: string;
	protected _format?: 'international' | 'national';

	/**
	 * Set country code
	 */
	countryCode(code: string): this {
		this._countryCode = code;
		return this;
	}

	/**
	 * Set phone number format
	 */
	format(format: 'international' | 'national'): this {
		this._format = format;
		return this;
	}

	/**
	 * Serialize to JSON
	 */
	toJSON(): SerializedComponent {
		const json = super.toJSON();
		if (this._countryCode) {
			json.countryCode = this._countryCode;
		}
		if (this._format) {
			json.format = this._format;
		}
		return json;
	}

	/**
	 * Factory method
	 */
	static make(name: string): PhoneNumberField {
		const field = new PhoneNumberField(name);
		field.configure();
		return field;
	}
}
```

### 2. Using Your Custom Field

Use your custom field in form schemas:

```typescript
import { FormBuilder } from '@maxal_studio/kratosjs';
import { PhoneNumberField } from '../fields/PhoneNumberField';

const form = FormBuilder.make().schema([
	PhoneNumberField.make('phone').label('Phone Number').countryCode('+1').format('international').required(),
]);
```

## Frontend: Creating a React Component

### 1. Required Imports

Import the necessary utilities from `@maxal_studio/kratosjs-react`:

```typescript
import { FieldProps, useValidation, getFieldError, ViewFieldWrapper, cn } from '@maxal_studio/kratosjs-react';
import { useFormContext, useWatch } from 'react-hook-form';
```

- **`FieldProps`**: The interface your component must implement
- **`useValidation`**: Hook that runs a field's KratosJs rules through the shared validation engine (the same one the server uses). Pass `props.operation` and `props.name` so conditional and cross-field rules resolve correctly.
- **`getFieldError`**: Resolves a field's error from React Hook Form, including nested/array names (e.g. a field inside a Repeater row, `items.0.name`) where a flat `errors[name]` lookup would miss it.
- **`ViewFieldWrapper`**: Component for consistent view mode rendering
- **`cn`**: Utility for conditional class names

### 2. Create the React Component

Create a React component that implements the `FieldProps` interface. The component must handle both `edit` and `view` modes:

```typescript
// src/components/PhoneNumberField.tsx
import React from 'react';
import { FieldProps, useValidation, getFieldError, ViewFieldWrapper, cn } from '@maxal_studio/kratosjs-react';
import { useFormContext, useWatch } from 'react-hook-form';

export function PhoneNumberField(props: FieldProps) {
	// View mode: render formatted display
	if (props.mode === 'view') {
		const value = props.value || '';
		const countryCode = props.countryCode || '+1';
		const format = props.format || 'international';

		return (
			<ViewFieldWrapper label={props.label}>
				{value ? (
					<span className="kratosjstext-primary">
						{format === 'international' ? `${countryCode} ${value}` : value}
					</span>
				) : (
					<span className="kratosjstext-secondary">-</span>
				)}
			</ViewFieldWrapper>
		);
	}

	// Edit mode: render input
	const {
		register,
		setValue,
		control,
		formState: { errors },
	} = useFormContext();
	const currentValue = useWatch({ control, name: props.name, defaultValue: props.default || '' });

	const countryCode = props.countryCode || '+1';
	const format = props.format || 'international';

	// Use the validation system
	const validation = useValidation(props.validation?.rules || [], props.operation, props.name);

	const error = getFieldError(errors, props.name);
	const hasError = !!error;

	return (
		<div className="mb-4">
			{props.label && (
				<label className="block text-sm font-medium kratosjstext-primary mb-2">
					{props.label}
					{props.validation?.rules?.includes('required') && (
						<span className="text-red-500 dark:text-red-400 ml-1">*</span>
					)}
				</label>
			)}

			<div className="flex">
				<span className="inline-flex items-center px-3 rounded-l-md border border-r-0 kratosjsborder bg-gray-50 dark:bg-gray-800 kratosjstext-secondary text-sm">
					{countryCode}
				</span>
				<input
					type="tel"
					{...register(props.name, validation)}
					value={currentValue}
					onChange={e => setValue(props.name, e.target.value, { shouldValidate: true })}
					className={cn(
						'flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border kratosjsborder focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]',
						hasError && 'border-red-500 dark:border-red-400',
					)}
					placeholder={props.placeholder || 'Enter phone number'}
					disabled={props.disabled}
					readOnly={props.readOnly}
				/>
			</div>

			{hasError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error?.message as string}</p>}

			{props.helperText && <p className="mt-1 text-sm kratosjstext-secondary">{props.helperText}</p>}

			{props.hint && (
				<p className="mt-1 text-sm kratosjstext-secondary">
					{props.hintIcon && <span className="mr-1">{props.hintIcon}</span>}
					{props.hint}
				</p>
			)}
		</div>
	);
}
```

### 2. Register Your Custom Field

Register your custom field component with the `FieldRegistryProvider`. **Important**: The key in the `customFields` object must match the `componentType` from your backend field class:

```typescript
// Backend: componentType = 'phone-number'
export class PhoneNumberField extends Field {
	protected componentType: string = 'phone-number';
	// ...
}

// Frontend: key must match 'phone-number'
const customFields = {
	'phone-number': PhoneNumberField, // ✅ Matches componentType
};
```

```typescript
// src/App.tsx
import React from 'react';
import { AdminPanel, FieldRegistryProvider } from '@maxal_studio/kratosjs-react';
import { PhoneNumberField } from './components/PhoneNumberField';

const customFields = {
	'phone-number': PhoneNumberField,
};

function App() {
	return (
		<FieldRegistryProvider customFields={customFields}>
			<AdminPanel apiBaseUrl="http://localhost:3001/kratosjs/api" dashboardPath="/admin" />
		</FieldRegistryProvider>
	);
}

export default App;
```

## Complete Example

### Backend Field Class

```typescript
// src/fields/RatingField.ts
import { Field } from '@maxal_studio/kratosjs';
import { SerializedComponent } from '@maxal_studio/kratosjs';

export class RatingField extends Field {
	protected componentType: string = 'rating';
	protected _maxRating: number = 5;
	protected _showLabels: boolean = false;
	protected _labels?: Record<number, string>;

	maxRating(max: number): this {
		this._maxRating = max;
		return this;
	}

	showLabels(show: boolean = true): this {
		this._showLabels = show;
		return this;
	}

	labels(labels: Record<number, string>): this {
		this._labels = labels;
		this._showLabels = true;
		return this;
	}

	toJSON(): SerializedComponent {
		const json = super.toJSON();
		json.maxRating = this._maxRating;
		json.showLabels = this._showLabels;
		if (this._labels) {
			json.labels = this._labels;
		}
		return json;
	}

	static make(name: string): RatingField {
		const field = new RatingField(name);
		field.configure();
		return field;
	}
}
```

### Frontend Component

```typescript
// src/components/RatingField.tsx
import React from 'react';
import { FieldProps, useValidation, getFieldError, ViewFieldWrapper, cn } from '@maxal_studio/kratosjs-react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Star } from 'lucide-react';

export function RatingField(props: FieldProps) {
	// View mode: render formatted display
	if (props.mode === 'view') {
		const value = props.value || 0;
		const maxRating = props.maxRating || 5;
		const showLabels = props.showLabels || false;
		const labels = props.labels || {};

		return (
			<ViewFieldWrapper label={props.label}>
				<div className="flex items-center gap-2">
					{Array.from({ length: maxRating }, (_, i) => i + 1).map(star => (
						<Star
							key={star}
							className={cn(
								'w-5 h-5',
								star <= value ? 'text-yellow-400 fill-current' : 'text-gray-300 dark:text-gray-600',
							)}
						/>
					))}
					{showLabels && labels[value] && (
						<span className="ml-2 text-sm kratosjstext-secondary">{labels[value]}</span>
					)}
				</div>
			</ViewFieldWrapper>
		);
	}

	// Edit mode: render interactive rating
	const {
		register,
		setValue,
		control,
		formState: { errors },
	} = useFormContext();
	const currentValue = useWatch({ control, name: props.name, defaultValue: props.default || 0 });

	const maxRating = props.maxRating || 5;
	const showLabels = props.showLabels || false;
	const labels = props.labels || {};

	// Use validation system
	const validation = useValidation(props.validation?.rules || [], props.operation, props.name);

	// Add custom validation for rating (value must be > 0 if required)
	if (props.validation?.rules?.includes('required')) {
		validation.validate = {
			...((validation.validate as Record<string, (value: number) => string | boolean>) || {}),
			notZero: (value: number) => value > 0 || 'Please select a rating',
		};
	}

	const error = getFieldError(errors, props.name);
	const hasError = !!error;

	const handleRatingClick = (rating: number) => {
		setValue(props.name, rating, { shouldValidate: true });
	};

	return (
		<div className="mb-4">
			{props.label && (
				<label className="block text-sm font-medium kratosjstext-primary mb-2">
					{props.label}
					{props.validation?.rules?.includes('required') && (
						<span className="text-red-500 dark:text-red-400 ml-1">*</span>
					)}
				</label>
			)}

			<div>
				<div className="flex items-center gap-1">
					{Array.from({ length: maxRating }, (_, i) => i + 1).map(rating => (
						<button
							key={rating}
							type="button"
							onClick={() => handleRatingClick(rating)}
							className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] rounded"
						>
							<Star
								className={cn(
									'w-6 h-6',
									rating <= currentValue
										? 'text-yellow-400 fill-current'
										: 'text-gray-300 dark:text-gray-600',
								)}
							/>
						</button>
					))}
				</div>
				{showLabels && labels[currentValue] && (
					<p className="mt-1 text-sm kratosjstext-secondary">{labels[currentValue]}</p>
				)}
			</div>

			{/* Hidden input for form integration with validation */}
			<input type="hidden" {...register(props.name, validation)} value={currentValue} />

			{hasError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error?.message as string}</p>}

			{props.helperText && <p className="mt-1 text-sm kratosjstext-secondary">{props.helperText}</p>}
		</div>
	);
}
```

### Registration

```typescript
// src/App.tsx
import { FieldRegistryProvider } from '@maxal_studio/kratosjs-react';
import { RatingField } from './components/RatingField';

const customFields = {
	rating: RatingField,
};

<FieldRegistryProvider customFields={customFields}>
	{/* Your app */}
</FieldRegistryProvider>
```

## FieldProps Interface

Your custom field component receives the `FieldProps` interface from `@maxal_studio/kratosjs-react`:

```typescript
interface FieldProps {
	type: string; // Field type (e.g., 'phone-number', 'star-rating')
	name: string; // Field name
	label?: string; // Field label
	mode?: 'edit' | 'view'; // Current mode
	value?: any; // Current field value (in view mode)
	default?: any; // Default value
	hidden?: boolean; // Whether field is hidden
	disabled?: boolean; // Whether field is disabled
	readOnly?: boolean; // Whether field is read-only
	validation?: {
		rules: string[]; // Validation rules array
		messages?: Record<string, string>;
		attributes?: Record<string, string>;
	};
	helperText?: string; // Helper text below field
	hint?: string; // Hint text
	hintIcon?: string; // Hint icon
	hintColor?: string; // Hint color
	placeholder?: string; // Placeholder text
	// ... and any custom properties you add in your backend field class
	// These are available directly on props (e.g., props.maxStars, props.countryCode)
}
```

### Key Props

- **`mode`**: Check `props.mode === 'view'` to render view mode, otherwise render edit mode
- **`value`**: Available in view mode, contains the current field value
- **`validation`**: Contains validation rules from your backend field definition
- **Custom properties**: Any properties you add in your backend field's `toJSON()` method are available directly on props (e.g., if your backend field sets `json.maxStars = 5`, you can access it as `props.maxStars`)

### Accessing Custom Properties

Custom properties from your backend field are automatically available on props. For example, if your backend field class has:

```typescript
toJSON(): SerializedComponent {
	const json = super.toJSON();
	json.maxStars = this._maxStars;
	json.countryCode = this._countryCode;
	return json;
}
```

You can access them directly in your React component:

```typescript
export function PhoneNumberField(props: FieldProps) {
	const countryCode = props.countryCode || '+1'; // Custom property
	const maxStars = props.maxStars || 5; // Another custom property
	// ...
}
```

## View Mode Implementation

Always implement view mode for your custom fields. This ensures your field displays correctly when viewing records (not just editing). Use `ViewFieldWrapper` for consistent styling:

```typescript
export function MyCustomField(props: FieldProps) {
	// Always check for view mode first
	if (props.mode === 'view') {
		const value = props.value || '';

		return (
			<ViewFieldWrapper label={props.label}>
				{value ? (
					<span className="kratosjstext-primary">{/* Your formatted display */}</span>
				) : (
					<span className="kratosjstext-secondary">-</span>
				)}
			</ViewFieldWrapper>
		);
	}

	// Edit mode implementation below...
}
```

The `ViewFieldWrapper` provides:

```typescript
if (props.mode === 'view') {
	return (
		<ViewFieldWrapper label={props.label}>
			{/* Your formatted display */}
		</ViewFieldWrapper>
	);
}
```

The `ViewFieldWrapper` provides:

- Consistent label/value layout
- Proper spacing and typography
- Dark mode support
- Empty state handling (shows "-" if children is empty/null)

## Validation

Use the `useValidation` hook to convert KratosJs validation rules to React Hook Form format:

```typescript
const validation = useValidation(props.validation?.rules || [], props.operation, props.name);

// Add custom validation if needed
if (props.validation?.rules?.includes('required')) {
	validation.validate = {
		...((validation.validate as Record<string, any>) || {}),
		customRule: (value: any) => {
			// Your custom validation logic
			return true; // or error message string
		},
	};
}

// Use with register
<input {...register(props.name, validation)} />
```

## Styling

Use KratosJs CSS classes for consistent styling:

- `kratosjstext-primary` - Primary text color
- `kratosjstext-secondary` - Secondary text color
- `kratosjsborder` - Border color (supports dark mode)
- `kratosjsbg-primary` - Primary background
- `kratosjsbg-secondary` - Secondary background

Use the `cn` utility for conditional class names:

```typescript
import { cn } from '@maxal_studio/kratosjs-react';

<div className={cn('base-class', hasError && 'error-class', isActive && 'active-class')} />
```

## Best Practices

1. **Always implement view mode**: Use `ViewFieldWrapper` for consistent view mode rendering
2. **Use FieldProps**: Import and use the `FieldProps` interface from `@maxal_studio/kratosjs-react`
3. **Use useValidation**: Use the `useValidation` hook for proper validation integration
4. **Use react-hook-form hooks**: Use `useFormContext`, `useWatch`, `register`, and `setValue` for form state management
5. **Access custom properties**: Custom properties from your backend field are available directly on props
6. **Handle errors**: Display validation errors using `getFieldError(errors, props.name)` (resolves nested/Repeater-row names too)
7. **Support dark mode**: Use KratosJs CSS classes that support dark mode
8. **Type safety**: TypeScript will infer custom properties from your backend field's JSON schema
