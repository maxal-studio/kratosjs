import { ColumnProps, cn } from '@maxal_studio/kratosjs-react';

/**
 * App-level custom table column — no plugin required.
 *
 * Registered in src/admin/main.tsx via:
 *   mountAdminPanel({ columns: { 'star-rating': StarRatingColumn } })
 *
 * The key 'star-rating' matches the backend StarRatingColumn's columnType.
 */
export default function StarRatingColumn({ column, record }: ColumnProps) {
	const value = record[column.name];
	const maxStars = (column as any).maxStars || 5;

	if (value === null || value === undefined || value === 0) {
		return <span className="text-gray-500 dark:text-gray-400">Not rated</span>;
	}

	return (
		<div className="flex items-center gap-0.5">
			{Array.from({ length: maxStars }, (_, i) => i + 1).map(star => (
				<span key={star} className={cn('text-base', star <= value ? 'text-yellow-400' : 'text-gray-300')}>
					{star <= value ? '★' : '☆'}
				</span>
			))}
		</div>
	);
}
