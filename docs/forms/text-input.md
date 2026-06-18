---
title: Text Input
---

# Text Input

The text input allows you to interact with a string value.

## Basic Usage

```typescript
import { TextInput } from '@maxal_studio/kratosjs';

TextInput.make('name');
```

## Setting the Input Type

You may set the type of string using a set of methods:

```typescript
TextInput.make('email')
	.email() // or
	.numeric() // or
	.integer() // or
	.password() // or
	.tel() // or
	.url();
```

You may instead use the `type()` method to pass another HTML input type:

```typescript
TextInput.make('color').type('color');
```

## Input Mode

You may set the `inputmode` attribute using the `inputMode()` method:

```typescript
TextInput.make('number').numeric().inputMode('decimal');
```

## Numeric Step

You may set the `step` attribute using the `step()` method:

```typescript
TextInput.make('quantity').numeric().step(0.5);
```

## Input Masking

Input masking defines a format that the input value must conform to:

```typescript
TextInput.make('phone').mask('(999) 999-9999').placeholder('(123) 456-7890');
```

## Prefix and Suffix

You may place text before and after the input:

```typescript
TextInput.make('domain').prefix('https://').suffix('.com');
```

## Validation

### Length Validation

```typescript
TextInput.make('name').minLength(2).maxLength(255);
```

### Numeric Value Validation

```typescript
TextInput.make('age').numeric().minValue(18).maxValue(100);
```

### Required Field

```typescript
TextInput.make('email').required().email();
```

## Read-Only

You may make the field read-only:

```typescript
TextInput.make('id').readOnly();
```

## Default Value

```typescript
TextInput.make('name').default('John Doe');
```

## Placeholder

```typescript
TextInput.make('email').placeholder('Enter your email address');
```

## Helper Text

```typescript
TextInput.make('password').helperText('Must be at least 8 characters');
```

## Hints

```typescript
TextInput.make('password').hint('Must be at least 8 characters').hintIcon('Lock').hintColor('warning');
```

## Complete Example

```typescript
TextInput.make('email')
	.label('Email Address')
	.email()
	.required()
	.placeholder('Enter your email')
	.helperText('We will never share your email')
	.hint('Must be a valid email address')
	.hintIcon('Mail')
	.default('user@example.com');
```
