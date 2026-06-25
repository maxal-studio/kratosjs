import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useResourceModal } from '../contexts/ResourceModalContext';
import { PanelMetadataProvider } from '../contexts/PanelMetadataContext';
import { PanelProviders } from '../contexts/PanelProviders';
import { Header } from './layout/Header';
import { Sidebar, ResourceMetadata } from './layout/Sidebar';
import { ResourceListPage } from '../pages/ResourceListPage';
import { PageRenderer } from './pages/PageRenderer';
import { ResourceModalRenderer } from './ResourceModalRenderer';
import { ErrorBoundary } from './errors/ErrorBoundary';
import { PillButton } from './ui/PillButton';
import { AdminPanelProps } from '../types';
import { authenticatedFetch } from '../api/authenticatedFetch';
import { useTranslation } from '../i18n/useTranslation';
import { useLocale } from '../i18n/useLocale';

export interface PageMetadata {
	slug: string;
	label: string;
	icon?: string;
	navigationGroup?: string;
	navigationSort?: number;
	hidden?: boolean;
}

interface PanelMetadata {
	id: string;
	title?: string;
	icon?: string;
	favicon?: string;
	basePath: string;
	resources: ResourceMetadata[];
	pages: PageMetadata[];
	globalSearchAvailable: boolean;
	/** Names of custom components registered server-side (informational) */
	customFields?: string[];
	customColumns?: string[];
	customWidgets?: string[];
	customBlocks?: string[];
}

function AdminPanelContent({ apiBaseUrl, panelId }: { apiBaseUrl: string; panelId?: string }) {
	const { t } = useTranslation();
	const { locale } = useLocale();
	const [darkMode, setDarkMode] = useState(() => {
		const stored = localStorage.getItem('darkMode');
		if (stored !== null) {
			return stored === 'true';
		}
		return window.matchMedia('(prefers-color-scheme: dark)').matches;
	});

	const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

	const [panelMetadata, setPanelMetadata] = useState<PanelMetadata | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Apply dark mode to document
	useEffect(() => {
		if (darkMode) {
			document.documentElement.classList.add('dark');
			localStorage.setItem('darkMode', 'true');
		} else {
			document.documentElement.classList.remove('dark');
			localStorage.setItem('darkMode', 'false');
		}
	}, [darkMode]);

	// Merge badge maps into panel metadata (resources and pages)
	const mergeBadgesIntoMeta = (
		meta: PanelMetadata,
		badges: {
			resources?: Record<string, { value: string | number | null; color?: string } | null>;
			pages?: Record<string, { value: string | number | null; color?: string } | null>;
		},
	): PanelMetadata => ({
		...meta,
		resources: (meta.resources || []).map(r => {
			const b = badges.resources?.[r.slug];
			return { ...r, badge: b?.value ?? null, badgeColor: b?.color };
		}),
		pages: (meta.pages || []).map(p => {
			const b = badges.pages?.[p.slug];
			return { ...p, badge: b?.value ?? null, badgeColor: b?.color };
		}),
	});

	// Fetch panel metadata and badges in parallel, then merge
	useEffect(() => {
		const metaUrl = panelId ? `${apiBaseUrl}/meta?panelId=${panelId}` : `${apiBaseUrl}/meta`;
		const badgesUrl = panelId ? `${apiBaseUrl}/meta/badges?panelId=${panelId}` : `${apiBaseUrl}/meta/badges`;

		const fetchMetadata = async () => {
			try {
				const [metaRes, badgesRes] = await Promise.all([
					authenticatedFetch(metaUrl, { headers: { 'Content-Type': 'application/json' } }, apiBaseUrl),
					authenticatedFetch(badgesUrl, { headers: { 'Content-Type': 'application/json' } }, apiBaseUrl),
				]);
				if (!metaRes.ok) {
					if (metaRes.status === 401) throw new Error('Unauthorized - Please login again');
					throw new Error(t('core:error.connect'));
				}
				const meta: PanelMetadata = await metaRes.json();
				const badges = badgesRes.ok ? await badgesRes.json() : { resources: {}, pages: {} };
				setPanelMetadata(mergeBadgesIntoMeta(meta, badges));
			} catch (err) {
				setError(err instanceof Error ? err.message : t('core:error.connect'));
			} finally {
				setLoading(false);
			}
		};

		fetchMetadata();
		// `locale` is a dependency so switching language re-fetches /meta (labels,
		// nav groups) in the new locale; the locale header is sent automatically.
	}, [apiBaseUrl, panelId, locale]);

	// Subscribe to badge refresh events and refetch badges
	useEffect(() => {
		const refreshBadges = async () => {
			const badgesUrl = panelId ? `${apiBaseUrl}/meta/badges?panelId=${panelId}` : `${apiBaseUrl}/meta/badges`;
			try {
				const res = await authenticatedFetch(
					badgesUrl,
					{ headers: { 'Content-Type': 'application/json' } },
					apiBaseUrl,
				);
				if (!res.ok) return;
				const badges = await res.json();
				setPanelMetadata(prev => (prev ? mergeBadgesIntoMeta(prev, badges) : prev));
			} catch {
				// ignore
			}
		};
		const handler = () => refreshBadges();
		window.addEventListener('kratosjs-refresh-badges', handler);
		return () => window.removeEventListener('kratosjs-refresh-badges', handler);
	}, [apiBaseUrl, panelId]);

	if (loading) {
		return (
			<div className="min-h-screen bg-base flex items-center justify-center">
				<div className="text-center">
					<Loader2 className="w-12 h-12 text-accent animate-spin mx-auto" />
					<p className="mt-4 text-fg-secondary">{t('core:panel.loading')}</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-base flex items-center justify-center">
				<div className="text-center p-8 bg-surface border border-border rounded-xl max-w-md">
					<AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
					<h2 className="text-xl font-semibold text-fg mb-2">{t('core:panel.connection_error')}</h2>
					<p className="text-fg-secondary mb-4">{error}</p>
					<PillButton variant="primary" onClick={() => window.location.reload()}>
						{t('core:common.retry')}
					</PillButton>
				</div>
			</div>
		);
	}

	if (!panelMetadata) {
		return (
			<div className="min-h-screen bg-base flex items-center justify-center">
				<div className="text-center p-8 bg-surface border border-border rounded-lg max-w-md">
					<p className="text-fg-secondary">{t('core:panel.empty')}</p>
				</div>
			</div>
		);
	}

	// Determine default route: first page if available, otherwise first resource
	const defaultRoute =
		panelMetadata.pages.length > 0
			? `/page/${panelMetadata.pages[0].slug}`
			: panelMetadata.resources.length > 0
				? `/${panelMetadata.resources[0].slug}`
				: '/';

	return (
		<PanelMetadataProvider resources={panelMetadata.resources} pages={panelMetadata.pages}>
			<div className="flex min-h-screen bg-base transition-colors">
				<Sidebar
					panelTitle={panelMetadata.title}
					panelIcon={panelMetadata.icon}
					panelFavicon={panelMetadata.favicon}
					resources={panelMetadata.resources}
					pages={panelMetadata.pages}
					mobileOpen={mobileSidebarOpen}
					onMobileClose={() => setMobileSidebarOpen(false)}
				/>

				<div className="flex min-w-0 flex-1 flex-col">
					<Header
						panelId={panelMetadata.id}
						darkMode={darkMode}
						onDarkModeToggle={() => setDarkMode(!darkMode)}
						onMobileMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
						apiBaseUrl={apiBaseUrl}
						globalSearchAvailable={panelMetadata.globalSearchAvailable}
					/>

					<main className="flex-1 overflow-hidden">
						<div className="h-full w-full overflow-auto p-4 sm:p-6">
							<ErrorBoundary label="this page">
								<Routes>
									<Route path="/" element={<Navigate to={defaultRoute} replace />} />
									{panelMetadata.pages.map(page => (
										<Route
											key={page.slug}
											path={`/page/${page.slug}`}
											element={<PageRenderer pageSlug={page.slug} apiBaseUrl={apiBaseUrl} />}
										/>
									))}
									{panelMetadata.resources.map(resource => (
										<Route
											key={resource.slug}
											path={`/${resource.slug}/*`}
											element={
												<ResourceListPage
													apiBaseUrl={apiBaseUrl}
													resourceSlug={resource.slug}
													resourceName={resource.label}
													pluralLabel={resource.pluralLabel}
												/>
											}
										/>
									))}
									<Route path="*" element={<Navigate to={defaultRoute} replace />} />
								</Routes>
							</ErrorBoundary>
						</div>
					</main>
				</div>

				<ModalStackRenderer apiBaseUrl={apiBaseUrl} />
			</div>
		</PanelMetadataProvider>
	);
}

/**
 * Renders all modals in the modal stack
 */
function ModalStackRenderer({ apiBaseUrl }: { apiBaseUrl: string }) {
	const { modalStack, closeModal, closeAllModals } = useResourceModal();

	// Refs so handlers always read the latest values without being recreated.
	// ResourceModalRenderer is memoized and ignores onClose/onCloseAll prop updates.
	const modalStackRef = useRef(modalStack);
	modalStackRef.current = modalStack;

	// When back is pressed on modal M, replaceState to the now-visible state:
	//   - Parent exists → /${parent.resource}/${parent.recordId}
	//   - M was the last modal → /${M.resource}  (the list)
	// We use replaceState (not navigate) so React Router's internal location is never
	// mutated — no modal refresh/flash.  Re-opening still works because navigate() from
	// a row-click always produces a new location.key, which ResourceListPage watches.
	//
	// IMPORTANT: only update the URL if it currently belongs to one of the open modal
	// resources.  If the user opened a modal via a cross-resource deeplink the URL bar
	// still shows the origin page (e.g. /withdrawals) — we must not overwrite that.
	const handleCloseModal = useCallback(() => {
		const stack = modalStackRef.current;
		if (stack.length === 0) return;

		const closing = stack[stack.length - 1];
		closeModal();

		if (stack.length === 1) {
			// Last modal closing — restore to where the user came from.
			// originUrl is set when the modal was opened via a cross-resource deeplink
			// (pushState updated the address bar; originUrl holds the prior URL).
			// Without originUrl, only update if the address bar is on this resource.
			if (closing.originUrl) {
				window.history.replaceState(null, '', closing.originUrl);
			} else {
				const firstSegment = window.location.pathname.split('/').filter(Boolean)[0] ?? '';
				if (firstSegment === closing.resource) {
					window.history.replaceState(null, '', `/${closing.resource}`);
				}
			}
		} else {
			// Parent modal is still visible — show the parent's own URL.
			// NOTE: we use the parent's resource/id, NOT parent.originUrl.
			// originUrl means "where to go when *the parent itself* closes",
			// not the URL to display while the parent is still open.
			const parent = stack[stack.length - 2];
			window.history.replaceState(null, '', `/${parent.resource}/${parent.recordId || ''}`);
		}
	}, [closeModal]);

	// Close All: jump straight to the origin (before any modal was opened).
	const handleCloseAll = useCallback(() => {
		const stack = modalStackRef.current;
		if (stack.length === 0) return;

		const root = stack[0];
		closeAllModals();

		if (root.originUrl) {
			// Root was opened via deeplink — restore the page the user came from.
			window.history.replaceState(null, '', root.originUrl);
		} else {
			// URL-based root — only reset to the list if the address bar is on it.
			const firstSegment = window.location.pathname.split('/').filter(Boolean)[0] ?? '';
			if (firstSegment === root.resource) {
				window.history.replaceState(null, '', `/${root.resource}`);
			}
		}
	}, [closeAllModals]);

	return (
		<>
			{modalStack.map(modal => (
				<ResourceModalRenderer
					key={`${modal.resource}-${modal.recordId || 'create'}-${modal.mode}-${modal.depth}`}
					modal={modal}
					apiBaseUrl={apiBaseUrl}
					onClose={handleCloseModal}
					onCloseAll={handleCloseAll}
				/>
			))}
		</>
	);
}

export function AdminPanel({
	apiBaseUrl,
	panelId,
	customFields,
	customColumns,
	customWidgets,
	customBlocks,
	customAuthChallenges,
	i18nConfig,
	plugins,
}: AdminPanelProps) {
	return (
		<BrowserRouter>
			<PanelProviders
				apiBaseUrl={apiBaseUrl}
				customFields={customFields}
				customColumns={customColumns}
				customWidgets={customWidgets}
				customBlocks={customBlocks}
				customAuthChallenges={customAuthChallenges}
				i18nConfig={i18nConfig}
				plugins={plugins}>
				<AdminPanelContent apiBaseUrl={apiBaseUrl} panelId={panelId} />
			</PanelProviders>
		</BrowserRouter>
	);
}
