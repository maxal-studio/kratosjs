---
title: Tags Column
---

# Tags Column

The tags column displays tags or arrays as badges.

## Basic Usage

```typescript
import { TagsColumn } from '@maxal_studio/kratosjs';

TagsColumn.make('tags');
```

## Separator

Set separator for tags (if rendered as text):

```typescript
TagsColumn.make('tags').separator(', ');
```

## Limit

Limit number of tags shown:

```typescript
TagsColumn.make('tags').limit(5);
```

## Searchable

Make the column searchable:

```typescript
TagsColumn.make('tags').searchable();
```

## Search Using

Search using multiple columns:

```typescript
TagsColumn.make('tags').searchUsing(['tags', 'categories']);
```

## Label

```typescript
TagsColumn.make('tags').label('Tags');
```

## Sorting

```typescript
TagsColumn.make('tags').sortable();
```

## Width

```typescript
TagsColumn.make('tags').width(200);
```

## Alignment

```typescript
TagsColumn.make('tags').alignment('left');
```

## Complete Example

```typescript
TagsColumn.make('tags').label('Tags').limit(5).separator(', ').searchable().sortable();
```
