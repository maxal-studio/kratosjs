---
title: S3 Storage
---

# S3 Storage

S3 storage adapter stores files on AWS S3.

## Configuration

```typescript
import { S3MediaAdapter } from '@maxal_studio/kratosjs';

const adminPanel = Panel.make('admin').mediaAdapters([
	new S3MediaAdapter({
		name: 's3-bucket',
		bucket: process.env.AWS_BUCKET_NAME,
		region: process.env.AWS_REGION,
		uploadPath: 'uploads/',
		accessKeyId: process.env.AWS_ACCESS_KEY_ID,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
		publicUrl: process.env.AWS_PUBLIC_URL,
		isDefault: false,
	}),
]);
```

## Adapter Options

- **`name`**: Unique name for the adapter
- **`bucket`**: S3 bucket name
- **`region`**: AWS region (e.g., 'us-east-1')
- **`uploadPath`**: Prefix path for uploaded files
- **`accessKeyId`**: AWS access key ID
- **`secretAccessKey`**: AWS secret access key
- **`publicUrl`**: Base URL for accessing uploaded files (e.g., CloudFront URL)
- **`isDefault`**: Set as the default adapter

## Environment Variables

```env
AWS_BUCKET_NAME=my-bucket
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_PUBLIC_URL=https://d1234567890.cloudfront.net
```

## Multiple S3 Adapters

You can configure multiple S3 adapters for different buckets:

```typescript
const adminPanel = Panel.make('admin').mediaAdapters([
	new S3MediaAdapter({
		name: 'production-bucket',
		bucket: process.env.AWS_BUCKET_NAME,
		region: process.env.AWS_REGION,
		uploadPath: 'uploads-prod/',
		accessKeyId: process.env.AWS_ACCESS_KEY_ID,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
		publicUrl: process.env.AWS_PUBLIC_URL,
		isDefault: false,
	}),
	new S3MediaAdapter({
		name: 'staging-bucket',
		bucket: process.env.AWS_STAGING_BUCKET_NAME,
		region: process.env.AWS_STAGING_REGION,
		uploadPath: 'uploads-staging/',
		accessKeyId: process.env.AWS_STAGING_ACCESS_KEY_ID,
		secretAccessKey: process.env.AWS_STAGING_SECRET_ACCESS_KEY,
		publicUrl: process.env.AWS_STAGING_PUBLIC_URL,
		isDefault: true,
	}),
]);
```

## Using in Forms

```typescript
FileUpload.make('avatar').image().disk('s3-bucket'); // Specify adapter name
```

## S3 Bucket Permissions

Make sure your S3 bucket has the following permissions:

```json
{
	"Version": "2012-10-17",
	"Statement": [
		{
			"Effect": "Allow",
			"Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
			"Resource": "arn:aws:s3:::your-bucket/*"
		}
	]
}
```

## Complete Example

```typescript
import { Panel, S3MediaAdapter } from '@maxal_studio/kratosjs';

const adminPanel = Panel.make('admin').mediaAdapters([
	new S3MediaAdapter({
		name: 's3-bucket',
		bucket: process.env.AWS_BUCKET_NAME as string,
		region: process.env.AWS_REGION as string,
		uploadPath: 'uploads-test/live/',
		accessKeyId: process.env.AWS_ACCESS_KEY_ID,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
		publicUrl: process.env.AWS_PUBLIC_URL as string,
		isDefault: true,
	}),
]);
```
