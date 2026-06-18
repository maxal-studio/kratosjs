import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/classNames';

export interface ErrorAlertProps {
	message: React.ReactNode;
	onDismiss?: () => void;
	className?: string;
}

export function ErrorAlert({ message, onDismiss, className }: ErrorAlertProps) {
	if (!message) return null;

	return (
		<div
			role="alert"
			className={cn(
				'flex items-start justify-between gap-3 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3',
				className,
			)}>
			<div className="flex min-w-0 items-start gap-2">
				<AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
				<p className="min-w-0 flex-1 break-words text-sm font-medium text-danger">{message}</p>
			</div>
			{onDismiss && (
				<button
					type="button"
					onClick={onDismiss}
					aria-label="Dismiss error"
					className="shrink-0 rounded-md p-1 text-danger transition-colors hover:bg-danger/10">
					<X className="h-4 w-4" />
				</button>
			)}
		</div>
	);
}
