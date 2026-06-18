---
title: File Upload
---

# File Upload

The file upload field allows users to upload files.

## Basic Usage

```typescript
import { FileUpload } from '@maxal_studio/kratosjs';

FileUpload.make('avatar');
```

## Image Upload

For image uploads:

```typescript
FileUpload.make('profileImage').image();
```

## Multiple Files

Allow multiple file uploads:

```typescript
FileUpload.make('gallery').image().multiple().maxFiles(5);
```

## Accepted File Types

```typescript
FileUpload.make('document').acceptedFileTypes(['.pdf', '.doc', '.docx']);
```

## File Size Limits

```typescript
FileUpload.make('avatar')
	.image()
	.maxSize(5 * 1024 * 1024) // 5MB
	.minSize(1024); // 1KB
```

## Storage Disk

Specify which storage adapter to use:

```typescript
FileUpload.make('avatar').image().disk('s3-bucket');
```

## Default Value

```typescript
FileUpload.make('avatar').image().default('https://example.com/default-avatar.png');
```

## Complete Example

```typescript
FileUpload.make('profileImage')
	.label('Profile Image')
	.image()
	.maxSize(5 * 1024 * 1024)
	.hint('Upload your profile image (max 5MB)')
	.hintIcon('Image');
```
