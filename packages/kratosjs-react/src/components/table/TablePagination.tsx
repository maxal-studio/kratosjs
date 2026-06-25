import React from 'react';
import { ChevronDown } from 'lucide-react';
import { SerializedTable } from '@maxal_studio/kratosjs';
import { Icon } from '../utils/Icon';
import { cn } from '../../utils/classNames';
import { translate } from '../../i18n/activeLocale';

interface TablePaginationProps {
	schema: SerializedTable;
	currentPage: number;
	perPage: number;
	totalRecords: number;
	onPageChange: (page: number) => void;
	onPageSizeChange: (size: number) => void;
	className?: string;
}

export function TablePagination({
	schema,
	currentPage,
	perPage,
	totalRecords,
	onPageChange,
	onPageSizeChange,
	className,
}: TablePaginationProps) {
	if (!schema.paginate || totalRecords === 0) {
		return null;
	}

	const lastPage = Math.ceil(totalRecords / perPage);

	const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [];
	const totalPages = lastPage;
	const current = currentPage;
	const delta = 2;

	if (totalPages <= 9) {
		for (let i = 1; i <= totalPages; i++) {
			pages.push(i);
		}
	} else {
		pages.push(1);

		const rangeStart = Math.max(2, current - delta);
		const rangeEnd = Math.min(totalPages - 1, current + delta);

		if (rangeStart > 2) {
			pages.push('ellipsis-start');
		}

		for (let i = rangeStart; i <= rangeEnd; i++) {
			pages.push(i);
		}

		if (rangeEnd < totalPages - 1) {
			pages.push('ellipsis-end');
		}

		pages.push(totalPages);
	}

	const rangeStart = (currentPage - 1) * perPage + 1;
	const rangeEnd = Math.min(currentPage * perPage, totalRecords);

	const navButtonClass =
		'inline-flex h-8 w-8 items-center justify-center rounded-full text-sm text-fg-secondary transition-colors hover:bg-hover/70 hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 touch-manipulation';

	const pageButtonClass = (active: boolean) =>
		cn(
			'inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2.5 text-sm transition-colors',
			active
				? 'bg-raised font-medium text-fg shadow-soft-sm'
				: 'text-fg-secondary hover:bg-hover/70 hover:text-fg',
		);

	return (
		<div className={cn('flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between', className)}>
			<div className="flex min-w-0 items-center gap-2">
				<span className="whitespace-nowrap text-sm text-fg-secondary">
					<span className="sm:hidden">
						{translate('core:pagination.range_compact', {
							start: rangeStart,
							end: rangeEnd,
							total: totalRecords,
						})}
					</span>
					<span className="hidden sm:inline">
						{translate('core:pagination.showing', {
							start: rangeStart,
							end: rangeEnd,
							total: totalRecords,
						})}
					</span>
				</span>
			</div>

			<div className="flex flex-wrap items-center gap-3 sm:gap-4">
				{schema.recordsPerPageOptions && schema.recordsPerPageOptions.length > 0 && (
					<div className="flex items-center gap-2">
						<span className="whitespace-nowrap text-sm text-fg-secondary">
							{translate('core:pagination.per_page_short')}
						</span>
						<div className="relative">
							<select
								value={perPage}
								onChange={e => onPageSizeChange(Number(e.target.value))}
								className="h-8 min-w-[4.5rem] appearance-none rounded-full border border-border bg-input/60 pl-3 pr-9 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-ring"
								aria-label={translate('core:pagination.per_page')}>
								{schema.recordsPerPageOptions.map(option => (
									<option key={option} value={option}>
										{option}
									</option>
								))}
							</select>
							<ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-muted" />
						</div>
					</div>
				)}

				<div className="flex items-center gap-1">
					<button
						onClick={() => onPageChange(currentPage - 1)}
						disabled={currentPage === 1}
						className={navButtonClass}
						title={translate('core:pagination.previous')}
						aria-label={translate('core:pagination.previous')}>
						<Icon name="ChevronLeft" size={16} />
					</button>

					<span className="min-w-16 px-2 py-1.5 text-center text-sm text-fg-secondary sm:hidden">
						{currentPage} / {lastPage}
					</span>

					<div className="hidden items-center gap-1 sm:flex">
						{pages.map((page, index) => {
							if (page === 'ellipsis-start' || page === 'ellipsis-end') {
								return (
									<span key={`ellipsis-${index}`} className="px-2 text-sm text-fg-muted">
										…
									</span>
								);
							}

							return (
								<button
									key={page}
									onClick={() => onPageChange(page as number)}
									className={pageButtonClass(currentPage === page)}
									aria-current={currentPage === page ? 'page' : undefined}>
									{page}
								</button>
							);
						})}
					</div>

					<button
						onClick={() => onPageChange(currentPage + 1)}
						disabled={currentPage === lastPage}
						className={navButtonClass}
						title={translate('core:pagination.next')}
						aria-label={translate('core:pagination.next')}>
						<Icon name="ChevronRight" size={16} />
					</button>
				</div>
			</div>
		</div>
	);
}
