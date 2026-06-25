import React from 'react';
import { Search } from 'lucide-react';
import { Icon } from '../utils/Icon';
import { cn } from '../../utils/classNames';
import { useTranslation } from '../../i18n/useTranslation';

interface TableSearchBarProps {
	searchable: boolean;
	searchQuery: string;
	onSearchChange: (query: string) => void;
	onCreateClick?: () => void;
	onCreateModalOpen?: () => void;
	showCreateButton?: boolean;
}

export function TableSearchBar({
	searchable,
	searchQuery,
	onSearchChange,
	onCreateClick,
	onCreateModalOpen,
	showCreateButton = true,
}: TableSearchBarProps) {
	const { t } = useTranslation();
	if (!searchable && !showCreateButton) {
		return null;
	}

	return (
		<div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
			{searchable && (
				<div className="relative min-w-0 flex-1">
					<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
					<input
						type="text"
						placeholder={t('core:common.search')}
						value={searchQuery}
						onChange={e => onSearchChange(e.target.value)}
						className={cn(
							'h-9 w-full rounded-full border border-border bg-input/60 pl-9 pr-4 text-sm text-fg',
							'placeholder:text-fg-muted',
							'focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring',
						)}
						aria-label={t('core:search.records')}
					/>
				</div>
			)}

			{showCreateButton && (
				<button
					onClick={onCreateClick || onCreateModalOpen}
					className={cn(
						'inline-flex h-9 shrink-0 touch-manipulation items-center justify-center gap-2 rounded-full bg-accent px-3 text-sm font-medium text-accent-fg transition-colors',
						'sm:px-4 hover:bg-accent-hover',
						!searchable && 'w-auto',
						searchable && 'w-9 sm:w-auto',
					)}
					title={t('core:table.create_record')}
					aria-label={t('core:table.create_record')}>
					<Icon name="Plus" className="h-4 w-4 shrink-0" />
					<span className="hidden sm:inline">{t('core:common.create')}</span>
				</button>
			)}
		</div>
	);
}
