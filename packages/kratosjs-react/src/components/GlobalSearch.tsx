import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, CornerDownLeft } from 'lucide-react';
import { Icon } from './utils/Icon';
import { cn } from '../utils/classNames';
import { authenticatedFetch } from '../api/authenticatedFetch';
import { useResourceModal } from '../contexts/ResourceModalContext';
import { Spinner } from './ui';

export interface GlobalSearchResult {
	_id: string;
	title: string;
	featuredImage?: { url: string; key: string; bucket: string };
	record: Record<string, unknown>;
}

export interface GlobalSearchResourceResults {
	label: string;
	pluralLabel: string;
	icon?: string;
	results: GlobalSearchResult[];
}

export interface GlobalSearchProps {
	apiBaseUrl: string;
	onResultClick?: (resourceSlug: string, recordId: string) => void;
}

function KeyboardHint({ children }: { children: React.ReactNode }) {
	return (
		<kbd className="inline-flex min-w-[20px] items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-[10px] font-medium text-fg-muted">
			{children}
		</kbd>
	);
}

export function GlobalSearch({ apiBaseUrl, onResultClick }: GlobalSearchProps) {
	const { openModal } = useResourceModal();
	const [paletteOpen, setPaletteOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [debouncedQuery, setDebouncedQuery] = useState('');
	const [results, setResults] = useState<Record<string, GlobalSearchResourceResults>>({});
	const [loading, setLoading] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(-1);

	const inputRef = useRef<HTMLInputElement>(null);

	const closePalette = useCallback(() => {
		setPaletteOpen(false);
		setQuery('');
		setDebouncedQuery('');
		setResults({});
		setSelectedIndex(-1);
		setLoading(false);
	}, []);

	const openPalette = useCallback(() => {
		setPaletteOpen(true);
	}, []);

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedQuery(query);
		}, 300);

		return () => clearTimeout(timer);
	}, [query]);

	useEffect(() => {
		if (!paletteOpen) return;

		const frame = requestAnimationFrame(() => {
			inputRef.current?.focus();
		});

		return () => cancelAnimationFrame(frame);
	}, [paletteOpen]);

	useEffect(() => {
		if (!debouncedQuery.trim()) {
			setResults({});
			setLoading(false);
			setSelectedIndex(-1);
			return;
		}

		const fetchResults = async () => {
			setLoading(true);
			try {
				const response = await authenticatedFetch(
					`${apiBaseUrl}/global-search`,
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ query: debouncedQuery }),
					},
					apiBaseUrl,
				);

				if (!response.ok) {
					throw new Error('Failed to fetch search results');
				}

				const data = await response.json();
				setResults(data);
				setSelectedIndex(-1);
			} catch (error) {
				console.error('Error fetching search results:', error);
				setResults({});
			} finally {
				setLoading(false);
			}
		};

		fetchResults();
	}, [debouncedQuery, apiBaseUrl]);

	useEffect(() => {
		const handleShortcut = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
				event.preventDefault();
				if (paletteOpen) {
					closePalette();
				} else {
					openPalette();
				}
			}
		};

		document.addEventListener('keydown', handleShortcut);
		return () => document.removeEventListener('keydown', handleShortcut);
	}, [paletteOpen, closePalette, openPalette]);

	useEffect(() => {
		if (!paletteOpen) return;

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				closePalette();
			}
		};

		document.addEventListener('keydown', handleEscape);
		return () => document.removeEventListener('keydown', handleEscape);
	}, [paletteOpen, closePalette]);

	const flattenedResults = useMemo(() => {
		const items: Array<{
			resourceSlug: string;
			result: GlobalSearchResult;
			resourceData: GlobalSearchResourceResults;
		}> = [];

		for (const [resourceSlug, resourceData] of Object.entries(results)) {
			for (const result of resourceData.results) {
				items.push({ resourceSlug, result, resourceData });
			}
		}

		return items;
	}, [results]);

	const handleResultClick = useCallback(
		(resourceSlug: string, recordId: string) => {
			openModal(resourceSlug, 'view', recordId);
			closePalette();
			onResultClick?.(resourceSlug, recordId);
		},
		[openModal, closePalette, onResultClick],
	);

	const handleKeyDown = (event: React.KeyboardEvent) => {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			if (flattenedResults.length === 0) return;
			setSelectedIndex(prev => (prev < flattenedResults.length - 1 ? prev + 1 : 0));
			return;
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			if (flattenedResults.length === 0) return;
			setSelectedIndex(prev => (prev > 0 ? prev - 1 : flattenedResults.length - 1));
			return;
		}

		if (event.key === 'Enter') {
			event.preventDefault();
			if (selectedIndex >= 0 && flattenedResults[selectedIndex]) {
				const { resourceSlug, result } = flattenedResults[selectedIndex];
				handleResultClick(resourceSlug, result._id);
			}
		}
	};

	const hasQuery = debouncedQuery.trim().length > 0;
	const hasResults = flattenedResults.length > 0;

	const palette = paletteOpen
		? createPortal(
				<div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh] sm:pt-[15vh]">
					<button
						type="button"
						className="absolute inset-0 bg-black/45 backdrop-blur-md"
						onClick={closePalette}
						aria-label="Close search"
					/>

					<div
						role="dialog"
						aria-modal="true"
						aria-label="Search records"
						className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border/80 bg-surface/95 shadow-soft-lg backdrop-blur-xl">
						<div className="flex items-center gap-3 border-b border-border px-4">
							<Search className="h-5 w-5 shrink-0 text-fg-muted" />
							<input
								ref={inputRef}
								type="text"
								value={query}
								onChange={event => setQuery(event.target.value)}
								onKeyDown={handleKeyDown}
								placeholder="Search records…"
								autoComplete="off"
								spellCheck={false}
								className="h-14 min-w-0 flex-1 bg-transparent text-base text-fg placeholder:text-fg-muted focus:outline-none"
							/>
							{loading && <Spinner size="sm" className="shrink-0 text-accent" />}
							{query && !loading && (
								<button
									type="button"
									onClick={() => {
										setQuery('');
										setDebouncedQuery('');
										setResults({});
										setSelectedIndex(-1);
										inputRef.current?.focus();
									}}
									className="rounded-md p-1 text-fg-muted transition-colors hover:bg-hover hover:text-fg"
									aria-label="Clear search">
									<X className="h-4 w-4" />
								</button>
							)}
						</div>

						<div className="max-h-[min(420px,52vh)] overflow-y-auto">
							{!hasQuery && (
								<div className="px-4 py-8 text-center">
									<p className="text-sm text-fg-secondary">Search across all records in this panel</p>
									<p className="mt-1 text-xs text-fg-muted">Start typing to see results</p>
								</div>
							)}

							{hasQuery && loading && (
								<div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-fg-secondary">
									<Spinner size="sm" className="text-accent" />
									Searching…
								</div>
							)}

							{hasQuery && !loading && !hasResults && (
								<div className="px-4 py-10 text-center text-sm text-fg-secondary">
									No results for &ldquo;{debouncedQuery}&rdquo;
								</div>
							)}

							{hasQuery && !loading && hasResults && (
								<div className="py-2">
									{Object.entries(results).map(([resourceSlug, resourceData]) => {
										let itemIndex = 0;
										for (const [slug, data] of Object.entries(results)) {
											if (slug === resourceSlug) break;
											itemIndex += data.results.length;
										}

										return (
											<div key={resourceSlug} className="mb-1 last:mb-0">
												<div className="flex items-center gap-2 px-4 py-1.5">
													{resourceData.icon && (
														<Icon
															name={resourceData.icon}
															className="h-3.5 w-3.5 text-fg-muted"
														/>
													)}
													<span className="text-[11px] font-medium uppercase tracking-wide text-fg-muted">
														{resourceData.pluralLabel}
													</span>
												</div>

												<ul className="px-2">
													{resourceData.results.map((result, resultIndex) => {
														const globalIndex = itemIndex + resultIndex;
														const isSelected = selectedIndex === globalIndex;

														return (
															<li key={result._id}>
																<button
																	type="button"
																	onMouseEnter={() => setSelectedIndex(globalIndex)}
																	onClick={() =>
																		handleResultClick(resourceSlug, result._id)
																	}
																	className={cn(
																		'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
																		isSelected
																			? 'bg-accent text-accent-fg'
																			: 'text-fg hover:bg-hover',
																	)}>
																	{result.featuredImage ? (
																		<div
																			className={cn(
																				'h-9 w-9 shrink-0 overflow-hidden rounded-lg',
																				isSelected
																					? 'ring-1 ring-white/20'
																					: 'bg-muted',
																			)}>
																			<img
																				src={result.featuredImage.url}
																				alt=""
																				className="h-full w-full object-cover"
																				onError={event => {
																					(
																						event.target as HTMLImageElement
																					).style.display = 'none';
																				}}
																			/>
																		</div>
																	) : (
																		<div
																			className={cn(
																				'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
																				isSelected
																					? 'bg-white/15 text-accent-fg'
																					: 'bg-muted text-fg-muted',
																			)}>
																			{resourceData.icon ? (
																				<Icon
																					name={resourceData.icon}
																					className="h-4 w-4"
																				/>
																			) : (
																				<Search className="h-4 w-4" />
																			)}
																		</div>
																	)}
																	<div className="min-w-0 flex-1">
																		<div
																			className={cn(
																				'truncate text-sm font-medium',
																				isSelected
																					? 'text-accent-fg'
																					: 'text-fg',
																			)}
																			dangerouslySetInnerHTML={{
																				__html: result.title,
																			}}
																		/>
																		<p
																			className={cn(
																				'truncate text-xs',
																				isSelected
																					? 'text-accent-fg/80'
																					: 'text-fg-muted',
																			)}>
																			{resourceData.label}
																		</p>
																	</div>
																	{isSelected && (
																		<CornerDownLeft className="h-4 w-4 shrink-0 opacity-80" />
																	)}
																</button>
															</li>
														);
													})}
												</ul>
											</div>
										);
									})}
								</div>
							)}
						</div>

						<div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-4 py-2.5 text-[11px] text-fg-muted">
							<span className="inline-flex items-center gap-1.5">
								<KeyboardHint>↑↓</KeyboardHint>
								Navigate
							</span>
							<span className="inline-flex items-center gap-1.5">
								<KeyboardHint>↵</KeyboardHint>
								Open
							</span>
							<span className="inline-flex items-center gap-1.5">
								<KeyboardHint>esc</KeyboardHint>
								Close
							</span>
						</div>
					</div>
				</div>,
				document.body,
			)
		: null;

	return (
		<>
			<button
				type="button"
				onClick={openPalette}
				aria-label="Search records"
				className={cn(
					'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-input/60 transition-colors sm:hidden',
					'hover:border-border-strong hover:bg-hover',
					'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
				)}>
				<Search className="h-4 w-4 text-fg-muted" />
			</button>

			<button
				type="button"
				onClick={openPalette}
				className={cn(
					'hidden h-9 w-full min-w-0 items-center gap-2 rounded-lg border border-border bg-input/60 px-3 text-left text-sm transition-colors sm:flex',
					'hover:border-border-strong hover:bg-hover',
					'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
				)}>
				<Search className="h-4 w-4 shrink-0 text-fg-muted" />
				<span className="min-w-0 flex-1 truncate text-fg-muted">Search records…</span>
				<kbd className="ml-auto shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-fg-muted">
					⌘K
				</kbd>
			</button>
			{palette}
		</>
	);
}
