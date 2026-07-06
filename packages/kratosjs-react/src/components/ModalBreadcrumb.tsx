import React from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';
import { useResourceModal, ModalState } from '../contexts/ResourceModalContext';
import { cn } from '../utils/classNames';
import { buildModalPath } from '../utils/modalUrl';
import { pillTabClass } from './ui/PillButton';
import { translate } from '../i18n/activeLocale';

function getModalKey(modal: ModalState): string {
	return `${modal.resource}-${modal.mode}-${modal.recordId || 'new'}`;
}

/**
 * Stack breadcrumb for nested modals — pill items matching sidebar/table tabs.
 */
export function ModalBreadcrumb() {
	const { modalStack, modalTitles, closeModal } = useResourceModal();

	if (modalStack.length <= 1) {
		return null;
	}

	const handleBreadcrumbClick = (targetIndex: number) => {
		const modalsToClose = modalStack.length - 1 - targetIndex;
		for (let i = 0; i < modalsToClose; i++) {
			closeModal();
		}

		const target = modalStack[targetIndex];
		// action modals have no routable path — fall back to the record they act on.
		const targetPath = buildModalPath(target) ?? `/${target.resource}/${target.recordId || ''}`;
		window.history.replaceState(null, '', targetPath);
	};

	return (
		<div className="shrink-0 border-b border-border/60 bg-base/30 px-4 py-2.5">
			<nav
				className="flex items-center gap-1 overflow-x-auto overscroll-x-contain"
				style={{ WebkitOverflowScrolling: 'touch' }}
				aria-label={translate('core:modal.stack')}>
				{modalStack.map((modal, index) => {
					const modalKey = getModalKey(modal);
					const title =
						modal.mode === 'action' && modal.actionLabel ? modal.actionLabel : modalTitles[modalKey];
					const isLast = index === modalStack.length - 1;

					return (
						<React.Fragment key={modalKey}>
							<button
								type="button"
								onClick={() => !isLast && handleBreadcrumbClick(index)}
								disabled={isLast}
								className={cn(
									pillTabClass(isLast),
									isLast ? 'cursor-default' : 'cursor-pointer',
									!title && 'italic',
								)}
								title={title || modal.resource}
								aria-current={isLast ? 'page' : undefined}>
								{!title ? (
									<>
										<Loader2 className="h-3.5 w-3.5 animate-spin" />
										<span>{translate('core:common.loading_ellipsis')}</span>
									</>
								) : (
									<span className="max-w-[180px] truncate">{title}</span>
								)}
							</button>

							{!isLast && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-fg-muted" aria-hidden />}
						</React.Fragment>
					);
				})}
			</nav>
		</div>
	);
}
