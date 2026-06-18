---
title: Color Picker
---

# Color Picker

The color picker field allows you to select colors in various formats.

## Basic Usage

```typescript
import { ColorPicker } from '@maxal_studio/kratosjs';

ColorPicker.make('themeColor');
```

## Format

Set the color format:

```typescript
ColorPicker.make('themeColor').format('hex'); // or 'rgb', 'rgba', 'hsl', 'hsla'
```

## Format Shortcuts

Use format shortcuts:

```typescript
ColorPicker.make('themeColor').hex(); // or .rgb(), .rgba(), .hsl(), .hsla()
```

## Label

```typescript
ColorPicker.make('themeColor').label('Theme Color');
```

## Default Value

```typescript
ColorPicker.make('themeColor').default('#FF5733');
```

## Required

```typescript
ColorPicker.make('themeColor').required();
```

## Helper Text

```typescript
ColorPicker.make('themeColor').helperText('Choose a theme color');
```

## Hints

```typescript
ColorPicker.make('themeColor').hint('Select a color').hintIcon('Palette');
```

## Hidden

```typescript
ColorPicker.make('internalColor').hidden();
```

## Disabled

```typescript
ColorPicker.make('themeColor').disabled();
```

## Complete Example

```typescript
ColorPicker.make('themeColor')
	.label('Theme Color')
	.hex()
	.default('#FF5733')
	.hint('Choose a theme color')
	.hintIcon('Palette');
```
