---
title: Relations
---

# Relations

Relations allow you to manage related records from within a resource. They create navigation links and management interfaces for related data.

## Defining Relations

Relations are defined in the resource's `relations()` method:

```typescript
static relations(): RelationConfig[] {
	return [
		{
			name: 'posts',
			resource: PostResource,
			label: 'Post',
			pluralLabel: 'Posts',
			icon: 'FileText',
			localKey: '_id', // User._id
			foreignKey: 'userId', // Post.userId → references User._id
			relatedKey: '_id', // Post._id
		},
	];
}
```

## Relation Properties

Each relation requires:

- **`name`**: Unique identifier for the relation (used in URLs)
- **`resource`**: The related resource class
- **`label`**: Singular label for the relation
- **`pluralLabel`**: Plural label for the relation
- **`icon`**: Lucide icon name
- **`localKey`**: Field on the current resource (usually `'_id'`)
- **`foreignKey`**: Field on the related resource that references the current resource
- **`relatedKey`**: Field on the related resource (usually `'_id'`)

Optional properties:

- **`group`**: Allows you to group multiple relations under a single tab in the admin UI:
    - `group.key`: Internal key for the group
    - `group.label`: Display label for the group
    - `group.icon`: Display icon for the group (Lucide icon name)

## One-to-Many Relations

A user has many posts:

```typescript
static relations(): RelationConfig[] {
	return [
		{
			name: 'posts',
			resource: PostResource,
			label: 'Post',
			pluralLabel: 'Posts',
			icon: 'FileText',
			localKey: '_id', // User._id
			foreignKey: 'userId', // Post.userId → references User._id
			relatedKey: '_id', // Post._id
		},
	];
}
```

## Many-to-Many Relations

Using a pivot table (e.g., Following resource):

```typescript
static relations(): RelationConfig[] {
	return [
		{
			name: 'followers',
			resource: FollowingResource,
			label: 'Follower',
			pluralLabel: 'Followers',
			icon: 'Users',
			group: { key: 'followers', label: 'Followers' },
			localKey: '_id', // User._id (current user / owner)
			relatedKey: '_id', // User._id (follower user)
			foreignKey: 'user', // Following.user → FK to local user
		},
		{
			name: 'following',
			resource: FollowingResource,
			label: 'Following',
			pluralLabel: 'Following',
			icon: 'UserPlus',
			group: { key: 'followers', label: 'Followers' },
			localKey: '_id', // User._id (current user / owner)
			relatedKey: '_id', // User._id (followed user)
			foreignKey: 'follower', // Following.follower → FK to local user
		},
	];
}
```

## Self-Referencing Relations

A resource can relate to itself:

```typescript
static relations(): RelationConfig[] {
	return [
		{
			name: 'parent',
			resource: CategoryResource,
			label: 'Parent Category',
			pluralLabel: 'Parent Categories',
			icon: 'Folder',
			localKey: 'parentId',
			foreignKey: '_id',
			relatedKey: '_id',
		},
		{
			name: 'children',
			resource: CategoryResource,
			label: 'Child Category',
			pluralLabel: 'Child Categories',
			icon: 'FolderTree',
			localKey: '_id',
			foreignKey: 'parentId',
			relatedKey: '_id',
		},
	];
}
```

## Accessing Relations

Relations appear in the resource's view page, allowing users to:

- View related records in a table
- Create new related records
- Edit existing related records
- Delete related records

## Complete Example

```typescript
import { PostResource } from './PostResource';
import { FollowingResource } from './FollowingResource';
import { StoryResource } from './StoryResource';

static relations(): RelationConfig[] {
	return [
		{
			name: 'posts',
			resource: PostResource,
			label: 'Post',
			pluralLabel: 'Posts',
			icon: 'FileText',
			localKey: '_id',
			foreignKey: 'userId',
			relatedKey: '_id',
		},
		{
			name: 'followers',
			resource: FollowingResource,
			label: 'Follower',
			pluralLabel: 'Followers',
			icon: 'Users',
			localKey: '_id',
			relatedKey: '_id',
			foreignKey: 'user',
		},
		{
			name: 'following',
			resource: FollowingResource,
			label: 'Following',
			pluralLabel: 'Following',
			icon: 'UserPlus',
			localKey: '_id',
			relatedKey: '_id',
			foreignKey: 'follower',
		},
		{
			name: 'stories',
			resource: StoryResource,
			label: 'Story',
			pluralLabel: 'Stories',
			icon: 'BookOpen',
			localKey: '_id',
			foreignKey: 'user',
			relatedKey: '_id',
		},
	];
}
```
