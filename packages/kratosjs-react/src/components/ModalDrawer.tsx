import React, { ReactNode, useEffect } from 'react';
import { X, ArrowLeft, Copy, Check } from 'lucide-react';
import { cn } from '../utils/classNames';
import { ModalBreadcrumb } from './ModalBreadcrumb';
import { PillIconButton } from './ui/PillButton';

export interface ModalDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	title: string | ReactNode;
	children: ReactNode;
	depth?: number;
	onCloseAll?: () => void;
	width?: string;
	onCopyUrl?: () => void;
	urlCopied?: boolean;
	/** Optional pinned footer (e.g. form buttons) */
	footer?: ReactNode;
}

export function ModalDrawer({
	isOpen,
	onClose,
	title,
	children,
	depth = 0,
	onCloseAll,
	onCopyUrl,
	urlCopied,
	footer,
}: ModalDrawerProps) {
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener('keydown', handleEscape);
			document.body.style.overflow = 'hidden';
		}

		return () => {
			document.removeEventListener('keydown', handleEscape);
			document.body.style.overflow = 'unset';
		};
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const zIndex = 50 + depth;

	const renderTitle = () => {
		if (typeof title === 'string') {
			if (/<[^>]+>/.test(title)) {
				return <span dangerouslySetInnerHTML={{ __html: title }} />;
			}
			return title;
		}
		return title;
	};

	return (
		<div className="fixed inset-0" style={{ zIndex }}>
			<div
				className={cn('absolute inset-0 transition-opacity', depth === 0 && 'bg-black/40 backdrop-blur-[2px]')}
				onClick={onCloseAll ?? onClose}
				aria-hidden
			/>

			<div
				className={cn(
					'fixed top-0 flex h-full w-full flex-col border-border bg-surface transition-transform duration-300 ease-out md:w-1/2 md:max-w-2xl md:border-l',
					'shadow-soft-lg',
				)}
				style={{
					right: depth === 0 ? '0px' : `${depth * 16}px`,
				}}
				onClick={e => e.stopPropagation()}
				role="dialog"
				aria-modal="true">
				{/* Header — matches app header height and tone */}
				<div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-base/80 px-4 backdrop-blur-sm">
					<div className="flex min-w-0 flex-1 items-center gap-2">
						<PillIconButton variant="ghost" onClick={onClose} aria-label="Close" title="Close">
							<ArrowLeft className="h-4 w-4" />
						</PillIconButton>

						<h2 className="truncate text-base font-semibold text-fg">{renderTitle()}</h2>
					</div>

					<div className="flex shrink-0 items-center gap-1">
						{onCopyUrl && (
							<PillIconButton
								variant="ghost"
								active={urlCopied}
								onClick={onCopyUrl}
								aria-label="Copy URL"
								title="Copy URL"
								className={urlCopied ? 'text-success' : undefined}>
								{urlCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
							</PillIconButton>
						)}
						{depth > 0 && onCloseAll && (
							<PillIconButton
								variant="danger"
								onClick={onCloseAll}
								aria-label="Close all"
								title="Close all">
								<X className="h-4 w-4" />
							</PillIconButton>
						)}
					</div>
				</div>

				<ModalBreadcrumb />

				<div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-surface p-4 sm:p-6">{children}</div>

				{footer && (
					<div className="shrink-0 border-t border-border/60 bg-base/50 px-4 py-3 sm:px-6 sm:py-4">
						{footer}
					</div>
				)}
			</div>
		</div>
	);
}
