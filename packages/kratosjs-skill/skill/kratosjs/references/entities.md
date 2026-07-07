# Entities

Entities are MikroORM `EntitySchema` definitions paired with a TypeScript interface. One entity per resource.

```ts
// src/entities/Product.ts
import { EntitySchema } from '@mikro-orm/core';

export interface IProduct {
	id: number;
	name: string;
	slug: string;
	price: number;
	quantity: number;
	image?: { key: string; bucket: string; url: string } | null;
	brand?: any;
	category?: any;
	createdAt: Date;
}

export const Product = new EntitySchema<IProduct>({
	name: 'Product',
	properties: {
		id: { type: 'number', primary: true, autoincrement: true },
		name: { type: 'string' },
		slug: { type: 'string', unique: true },
		price: { type: 'float', default: 0 },
		quantity: { type: 'number', default: 0 },
		image: { type: 'json', nullable: true }, // media JSON: { key, bucket, url }
		brand: { kind: 'm:1', entity: () => Brand, nullable: true },
		category: { kind: 'm:1', entity: () => Category, nullable: true },
		createdAt: { type: 'Date', onCreate: () => new Date() },
	} as any, // `as any` on properties avoids TS friction with EntitySchema generics
});
```

## Primary keys per driver

- **SQL** (mysql, postgresql, mariadb, sqlite):
    ```ts
    id: { type: 'number', primary: true, autoincrement: true }
    ```
- **MongoDB**:
    ```ts
    _id: { type: 'ObjectId', primary: true },
    id: { type: 'string', serializedPrimaryKey: true }
    ```

The CLI injects the right shape for your chosen driver. You can also use the exported `idProps` helper from `@maxal_studio/kratosjs`.

## Relations

Declared with `kind` on the property:

```ts
brand:    { kind: 'm:1', entity: () => Brand, nullable: true },          // many products → one brand
items:    { kind: '1:m', entity: () => OrderItem, mappedBy: 'order' },   // one order → many items
parent:   { kind: 'm:1', entity: () => Category, nullable: true },       // self-reference (tree)
```

- Use a **lazy `entity: () => X`** to avoid circular-import issues.
- A `m:1` owns the foreign key column; the inverse `1:m` uses `mappedBy`.
- **Many-to-many is modeled with an explicit join entity** (e.g. `OrderItem` linking `Order` and `Product`), not `kind: 'm:n'` — this gives the join its own resource, form, and extra columns (quantity, unit price). See `references/relations.md`.

## Media fields

Store uploaded files as a `json` column holding `{ key, bucket, url }`. The resource's `FileUpload` input writes this shape; render it via `panel.resolveMediaUrl(record.image)` (see `references/media.md` and `references/cells.md`).

## Registering

Import the entity into its resource (`static entity = Product`). MikroORM discovers entities through the resources you register on the panel — you don't maintain a separate entity list. With `{ updateSchema: true }` the schema auto-syncs on boot in dev; for production use migrations (`npx mikro-orm migration:create`).
