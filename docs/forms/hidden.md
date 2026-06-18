---
title: Hidden
---

# Hidden

The hidden field stores a value without rendering visible UI.

## Basic Usage

```typescript
import { Hidden } from '@maxal_studio/kratosjs';

Hidden.make('userId');
```

## Default Value

Set a default value:

```typescript
Hidden.make('userId').default('123');
```

## Dynamic Default

Set a dynamic default value:

```typescript
Hidden.make('userId').default(context => context.user?.id);
```

## Complete Example

```typescript
Hidden.make('userId').default('123');
```
