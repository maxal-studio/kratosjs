---
title: Overview
---

# Forms

KratosJs forms allow you to easily build dynamic forms in your app. Forms are used within resources, pages, and actions.

## Introduction

Form field classes can be found in the `@maxal_studio/kratosjs` package. They reside within the schema array of components. KratosJs ships with many types of fields, suitable for editing different types of data:

- [Text Input](/forms/text-input)
- [Select](/forms/select)
- [Textarea](/forms/textarea)
- [Checkbox](/forms/checkbox)
- [Toggle](/forms/toggle)
- [Radio](/forms/radio)
- [Date Time Picker](/forms/date-time-picker)
- [Color Picker](/forms/color-picker)
- [File Upload](/forms/file-upload)
- [Rich Editor](/forms/rich-editor)
- [Repeater](/forms/repeater)
- [Tags Input](/forms/tags-input)
- [Section](/forms/section)
- [Group](/forms/group)
- [Tabs](/forms/tabs)
- [Hidden](/forms/hidden)
- [Custom Fields](/forms/custom-fields) - Creating custom form fields

You may also create your own custom fields to edit data however you wish.

## Creating a Form

Fields may be created using the static `make()` method, passing its unique name:

```typescript
import { FormBuilder, TextInput } from '@maxal_studio/kratosjs';

const form = FormBuilder.make().schema([
	TextInput.make('name').label('Name').required(),
	TextInput.make('email').label('Email').email().required(),
]);
```

## Common Field Methods

All fields support common methods:

### Labeling

```typescript
TextInput.make('name').label('Full Name').placeholder('Enter your name').helperText('This will be displayed publicly');
```

### Validation

Validation rules can be declared two equivalent ways. Use the convenience
methods for the common cases:

```typescript
TextInput.make('email').required().email().min(5).max(255);
```

…or pass an array of rules, which is fully type-checked (autocomplete for every
known rule, template-literal hints for parameterized rules like `max:255`):

```typescript
TextInput.make('email').rules(['required', 'email', 'min:5', 'max:255']);
TextInput.make('email').rules('required|email|max:255'); // pipe-delimited string also works
```

Both styles feed the same engine, so they can be mixed freely.

**Rules are enforced on both the client and the server.** A single shared
validation engine runs in the browser (instant inline errors) _and_ in the API
(the source of truth) — so a value that bypasses the UI is still rejected by the
server with a `400` and a `{ field, rule, message }` body.

Built-in rules: `required`, `email`, `url`, `integer`, `numeric`, `alpha`,
`alpha_num`, `alpha_dash`, `uuid`, `json`, `confirmed`, `min:<n>`, `max:<n>`,
`min_value:<n>`, `max_value:<n>`, `regex:<pattern>`, `same:<field>`,
`confirmed:<field>`. The `min`/`max` rules are value-kind aware — they check
string length, numeric value, or array length depending on the field's value.

Rules can be conditional, evaluated against the live form context:

```typescript
// Required only when creating, not when editing
TextInput.make('password').required(context => context.operation === 'create');
```

Custom error messages:

```typescript
TextInput.make('email').email().validationMessages({ email: 'That email looks off.' });
```

> Plugins can register their own rules so they become first-class (and
> autocompleted) in `.rules([...])` — see [Creating Plugins](/plugins/creating-plugins#custom-validation-rules).

### State Management

```typescript
TextInput.make('name')
	.default('John Doe')
	.hidden(context => !context.get('showName'))
	.disabled(context => context.operation === 'view');
```

### Hints

```typescript
TextInput.make('password').hint('Must be at least 8 characters').hintIcon('Lock').hintColor('warning');
```

## Form Context

Fields can access form context to make dynamic decisions:

```typescript
TextInput.make('confirmPassword')
	.hidden(context => !context.get('password'))
	.required(context => !!context.get('password'));
```

The context provides:

- **`operation`**: Current operation ('create', 'edit', 'view')
- **`get(field)`**: Get value of another field
- **`record`**: Current record (in edit/view operations)

## Layout & Nesting

`Section`, `Group`, `Tabs`, and `Repeater` are **container** components that nest other fields. They all expose their children through one declarative contract, so the framework discovers nested fields generically — default values, validation, permission filtering, and the form renderer all "just work" no matter how deeply fields are nested:

- nested components are serialized under a `schema` key,
- `isLayout` marks pure layout containers (Section/Group/Tabs/Tab) that hold no value of their own,
- `childScope: 'array'` marks containers whose children are an item template stored under the container's own name (`Repeater`).

Because this is a contract rather than hardcoded handling, plugins can ship their own container components and the core understands them automatically — see [Custom Container Components](/plugins/custom-components#creating-custom-container-components).

## Next Steps

Explore individual field types:

- [Text Input](/forms/text-input)
- [Select](/forms/select)
- [Textarea](/forms/textarea)
- [Checkbox](/forms/checkbox)
- [Toggle](/forms/toggle)
- [Radio](/forms/radio)
- [Date Time Picker](/forms/date-time-picker)
- [Color Picker](/forms/color-picker)
- [File Upload](/forms/file-upload)
- [Rich Editor](/forms/rich-editor)
- [Repeater](/forms/repeater)
- [Tags Input](/forms/tags-input)
- [Section](/forms/section)
- [Group](/forms/group)
- [Tabs](/forms/tabs)
- [Hidden](/forms/hidden)
- [Custom Fields](/forms/custom-fields) - Creating custom form fields
