import type { CustomBlockComponentProps } from '@maxal_studio/kratosjs-react';
import { cn } from '@maxal_studio/kratosjs-react';

/**
 * App-level custom block component — no plugin required.
 *
 * Registered in src/admin/main.tsx via:
 *   mountAdminPanel({ blocks: { callout: CalloutBlock } })
 *
 * The key 'callout' matches the backend CalloutBlock's blockType. Custom props
 * serialized on the backend (message, tone) arrive on the `block` object.
 */
const toneClasses: Record<string, string> = {
	info: 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100',
	success: 'border-green-300 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100',
	warning:
		'border-yellow-300 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100',
};

export default function CalloutBlock({ block }: CustomBlockComponentProps) {
	const tone = (block.tone as string) || 'info';
	return (
		<div className={cn('rounded-lg border p-4', toneClasses[tone] ?? toneClasses.info)}>
			<p className="text-sm">{block.message}</p>
		</div>
	);
}
