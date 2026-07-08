import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { BlockRenderer } from '../blocks/BlockRenderer';
import { cn } from '../../utils/classNames';
import { authenticatedFetch } from '../../api/authenticatedFetch';
import { translate } from '../../i18n/activeLocale';
import { Slot } from '../../slots/Slot';
import { getBlockColSpanClasses } from '../utils/layoutHelpers';

export interface PageRendererProps {
	pageSlug: string;
	apiBaseUrl: string;
}

export function PageRenderer({ pageSlug, apiBaseUrl }: PageRendererProps) {
	const [pageData, setPageData] = useState<any>(null);
	const [widgetData, setWidgetData] = useState<Record<string, any>>({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const location = useLocation();

	useEffect(() => {
		const fetchPageData = async () => {
			setLoading(true);
			setError(null);

			try {
				// Extract query parameters from the URL
				const searchParams = new URLSearchParams(location.search);
				const queryString = searchParams.toString();
				const url = `${apiBaseUrl}/pages/${pageSlug}${queryString ? `?${queryString}` : ''}`;

				// Use authenticated fetch which handles token refresh automatically
				const response = await authenticatedFetch(
					url,
					{
						headers: {
							'Content-Type': 'application/json',
						},
					},
					apiBaseUrl,
				);

				if (!response.ok) {
					// If still 401 after refresh attempt, user needs to login
					if (response.status === 401) {
						throw new Error('Unauthorized - Please login again');
					}
					const error = await response.json();
					throw new Error(`Failed to fetch page: ${error.message || response.statusText}`);
				}

				const data = await response.json();
				setPageData(data.page);
				setWidgetData(data.widgetData || {});
			} catch (err: any) {
				setError(err.message || translate('core:error.load_page'));
			} finally {
				setLoading(false);
			}
		};

		fetchPageData();
	}, [pageSlug, apiBaseUrl, location.search]);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-gray-500 dark:text-gray-400">{translate('core:page.loading')}</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-red-500 dark:text-red-400">{error}</div>
			</div>
		);
	}

	if (!pageData) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-gray-500 dark:text-gray-400">{translate('core:state.page_not_found')}</div>
			</div>
		);
	}

	// Group blocks into rows based on column widths
	const groupBlocksIntoRows = (blocks: any[]) => {
		const rows: any[][] = [];
		let currentRow: any[] = [];
		let currentRowWidth = 0;

		for (const block of blocks) {
			const blockColumns = block.columns || 12; // Default to full width if not specified

			// If adding this block would exceed 12 columns, start a new row
			if (currentRowWidth + blockColumns > 12 && currentRow.length > 0) {
				rows.push(currentRow);
				currentRow = [block];
				currentRowWidth = blockColumns;
			} else {
				currentRow.push(block);
				currentRowWidth += blockColumns;
			}
		}

		// Add the last row if it has blocks
		if (currentRow.length > 0) {
			rows.push(currentRow);
		}

		return rows;
	};

	const blockRows = pageData.blocks && pageData.blocks.length > 0 ? groupBlocksIntoRows(pageData.blocks) : [];

	return (
		<div className="w-full max-w-7xl mx-auto">
			<Slot
				name="page.top"
				context={{ schema: pageData, location: `/page/${pageSlug}` }}
				as="div"
				className="mb-6 space-y-6 empty:hidden"
			/>
			{blockRows.length > 0 ? (
				<div className="space-y-3 lg:space-y-6">
					{blockRows.map((row, rowIndex) => (
						<div key={rowIndex} className="grid grid-cols-12 gap-x-6 gap-y-3 lg:gap-y-6">
							{row.map((block: any, blockIndex: number) => {
								const blockColumns = block.columns || 12;
								const colSpanClass = getBlockColSpanClasses(blockColumns);
								return (
									<div key={blockIndex} className={colSpanClass}>
										<BlockRenderer block={block} blockData={widgetData} apiBaseUrl={apiBaseUrl} />
									</div>
								);
							})}
						</div>
					))}
				</div>
			) : (
				<div className="text-gray-500 dark:text-gray-400">{translate('core:page.no_content')}</div>
			)}
			<Slot
				name="page.bottom"
				context={{ schema: pageData, location: `/page/${pageSlug}` }}
				as="div"
				className="mt-6 space-y-6 empty:hidden"
			/>
		</div>
	);
}
