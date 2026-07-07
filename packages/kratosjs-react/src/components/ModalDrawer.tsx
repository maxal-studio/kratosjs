import React, { ReactNode, useEffect } from 'react';
import { X, ArrowLeft, Copy, Check } from 'lucide-react';
import { cn } from '../utils/classNames';
import { ModalBreadcrumb } from './ModalBreadcrumb';
import { PillIconButton } from './ui/PillButton';
import { translate } from '../i18n/activeLocale';
import { Slot } from '../slots/Slot';

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
	/**
	 * When true (default), clicking the backdrop of a stacked modal closes the whole
	 * stack (onCloseAll). Set false so the backdrop closes only this modal (onClose) —
	 * used for action modals, whose onClose is the only path that tears down their state.
	 */
	backdropClosesAll?: boolean;
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
	backdropClosesAll = true,
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
				onClick={backdropClosesAll ? (onCloseAll ?? onClose) : onClose}
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
						<PillIconButton
							variant="ghost"
							onClick={onClose}
							aria-label={translate('core:modal.close')}
							title={translate('core:modal.close')}>
							<ArrowLeft className="h-4 w-4" />
						</PillIconButton>

						<h2 className="truncate text-base font-semibold text-fg">{renderTitle()}</h2>
					</div>

					<div className="flex shrink-0 items-center gap-1">
						<Slot name="modal.headerActions" as="div" className="flex items-center gap-1 empty:hidden" />
						{onCopyUrl && (
							<PillIconButton
								variant="ghost"
								active={urlCopied}
								onClick={onCopyUrl}
								aria-label={translate('core:common.copy_url')}
								title={translate('core:common.copy_url')}
								className={urlCopied ? 'text-success' : undefined}>
								{urlCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
							</PillIconButton>
						)}
						{depth > 0 && onCloseAll && (
							<PillIconButton
								variant="danger"
								onClick={onCloseAll}
								aria-label={translate('core:modal.close_all')}
								title={translate('core:modal.close_all')}>
								<X className="h-4 w-4" />
							</PillIconButton>
						)}
					</div>
				</div>

				<ModalBreadcrumb />

				<div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-surface p-4">{children}</div>

				{/* Pinned footer: the `footer` prop and/or the `modal.footer` slot.
				    `empty:hidden` collapses the bar when neither contributes. */}
				<div className="shrink-0 border-t border-border/60 bg-base/50 px-4 py-3 empty:hidden sm:px-6 sm:py-4">
					{footer}
					<Slot name="modal.footer" as="div" className="mt-2 first:mt-0 empty:hidden" />
				</div>
			</div>
		</div>
	);
}
