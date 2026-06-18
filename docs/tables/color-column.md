---
title: Color Column
---

# Color Column

The color column displays color swatches in a table.

## Basic Usage

```typescript
import { ColorColumn } from '@maxal_studio/kratosjs';

ColorColumn.make('themeColor');
```

## Label

```typescript
ColorColumn.make('themeColor').label('Theme Color');
```

## Sorting

```typescript
ColorColumn.make('themeColor').sortable();
```

## Copyable

Make the color copyable:

```typescript
ColorColumn.make('themeColor').copyable();
```

## Width

```typescript
ColorColumn.make('themeColor').width(100);
```

## Alignment

```typescript
ColorColumn.make('themeColor').alignment('center');
```

## Complete Example

```typescript
ColorColumn.make('themeColor').label('Theme Color').copyable().width(100).alignment('center');
```
