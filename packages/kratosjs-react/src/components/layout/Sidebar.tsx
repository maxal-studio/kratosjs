import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { Icon } from '../utils/Icon';
import { cn } from '../../utils/classNames';
import { IconButton } from '../ui';
import { PanelBrandMark } from './PanelBrandMark';

export interface ResourceMetadata {
	slug: string;
	label: string;
	pluralLabel: string;
	icon?: string;
	navigationGroup?: string;
	navigationSort?: number;
	hasForm: boolean;
	hasTable: boolean;
	hasActions: boolean;
	hidden?: boolean;
	badge?: string | number | null;
	badgeColor?: string;
}

export interface PageMetadata {
	slug: string;
	label: string;
	icon?: string;
	navigationGroup?: string;
	navigationSort?: number;
	hidden?: boolean;
	badge?: string | number | null;
	badgeColor?: string;
}

export interface SidebarProps {
	panelTitle?: string;
	panelIcon?: string;
	panelFavicon?: string;
	resources: ResourceMetadata[];
	pages?: PageMetadata[];
	mobileOpen: boolean;
	onMobileClose: () => void;
}

type NavItem = (ResourceMetadata & { type: 'resource' }) | (PageMetadata & { type: 'page' });

type NavElement = { type: 'ungrouped'; item: NavItem } | { type: 'group'; group: string; items: NavItem[] };

function getBadgeClassName(color?: string): string {
	const base = 'inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-none';

	if (!color || color.toLowerCase() === 'gray') {
		return `${base} bg-raised text-fg-secondary`;
	}

	const semantic: Record<string, string> = {
		blue: 'bg-accent-soft text-accent',
		green: 'bg-success-soft text-success',
		red: 'bg-danger-soft text-danger',
		yellow: 'bg-warning-soft text-warning',
	};

	const lower = color.toLowerCase();
	if (semantic[lower]) return `${base} ${semantic[lower]}`;
	return base;
}

function getBadgeStyle(color?: string): React.CSSProperties | undefined {
	if (!color || /^(blue|green|red|yellow|gray)$/i.test(color)) return undefined;
	return { backgroundColor: color, color: '#fff' };
}

interface NavItemButtonProps {
	item: NavItem;
	isActive: boolean;
	onClick: () => void;
}

function NavItemButton({ item, isActive, onClick }: NavItemButtonProps) {
	const displayLabel = item.type === 'resource' ? item.pluralLabel : item.label;
	const displayIcon = item.icon || (item.type === 'page' ? 'FileText' : 'Menu');

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				'flex w-full items-center justify-between gap-2 rounded-full px-3 py-2 text-sm transition-colors',
				isActive
					? 'bg-raised font-medium text-fg shadow-soft-sm'
					: 'text-fg-secondary hover:bg-hover/70 hover:text-fg',
			)}>
			<span className="flex min-w-0 flex-1 items-center gap-2.5">
				<Icon name={displayIcon} className={cn('h-4 w-4 shrink-0', isActive ? 'text-fg' : 'text-fg-muted')} />
				<span className="truncate">{displayLabel}</span>
			</span>
			{item.badge !== undefined && item.badge !== null && item.badge !== '' && (
				<span className={getBadgeClassName(item.badgeColor)} style={getBadgeStyle(item.badgeColor)}>
					{String(item.badge)}
				</span>
			)}
		</button>
	);
}

export function Sidebar({
	panelTitle,
	panelIcon,
	panelFavicon,
	resources,
	pages = [],
	mobileOpen,
	onMobileClose,
}: SidebarProps) {
	const navigate = useNavigate();
	const location = useLocation();

	const visibleResources = useMemo(() => resources.filter(resource => !resource.hidden), [resources]);
	const visiblePages = useMemo(() => pages.filter(page => !page.hidden), [pages]);

	const navItems: NavItem[] = [
		...visibleResources.map(r => ({ ...r, type: 'resource' as const })),
		...visiblePages.map(p => ({ ...p, type: 'page' as const })),
	];

	const sortedNavItems = [...navItems].sort((a, b) => {
		if (a.navigationSort !== undefined && b.navigationSort !== undefined) {
			return a.navigationSort - b.navigationSort;
		}
		if (a.navigationSort !== undefined) return -1;
		if (b.navigationSort !== undefined) return 1;
		return a.label.localeCompare(b.label);
	});

	const groupedNavItems: Record<string, NavItem[]> = {};
	const ungroupedNavItems: NavItem[] = [];

	sortedNavItems.forEach(item => {
		if (item.navigationGroup) {
			if (!groupedNavItems[item.navigationGroup]) {
				groupedNavItems[item.navigationGroup] = [];
			}
			groupedNavItems[item.navigationGroup].push(item);
		} else {
			ungroupedNavItems.push(item);
		}
	});

	const navElements: NavElement[] = [];

	ungroupedNavItems.forEach(item => {
		navElements.push({ type: 'ungrouped', item });
	});

	Object.entries(groupedNavItems).forEach(([group, items]) => {
		navElements.push({ type: 'group', group, items });
	});

	navElements.sort((a, b) => {
		const getSortValue = (element: NavElement): number => {
			if (element.type === 'ungrouped') {
				return element.item.navigationSort ?? Infinity;
			}
			return Math.min(...element.items.map(item => item.navigationSort ?? Infinity));
		};

		const aSort = getSortValue(a);
		const bSort = getSortValue(b);

		if (aSort !== Infinity && bSort !== Infinity) return aSort - bSort;
		if (aSort !== Infinity) return -1;
		if (bSort !== Infinity) return 1;
		if (a.type === 'ungrouped' && b.type === 'group') return -1;
		if (a.type === 'group' && b.type === 'ungrouped') return 1;
		if (a.type === 'ungrouped' && b.type === 'ungrouped') {
			return a.item.label.localeCompare(b.item.label);
		}
		if (a.type === 'group' && b.type === 'group') {
			return a.group.localeCompare(b.group);
		}
		return 0;
	});

	const currentPath = location.pathname;
	const isPageRoute = currentPath.startsWith('/page/');
	const currentSlug = isPageRoute ? currentPath.replace('/page/', '') : currentPath.split('/')[1] || '';

	const isItemActive = (item: NavItem) =>
		item.type === 'page' ? isPageRoute && currentSlug === item.slug : !isPageRoute && currentSlug === item.slug;

	const handleItemClick = (item: NavItem) => {
		if (item.type === 'page') {
			navigate(`/page/${item.slug}`);
		} else {
			navigate(`/${item.slug}`);
		}
		onMobileClose();
	};

	return (
		<>
			{mobileOpen && (
				<div
					className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
					onClick={onMobileClose}
					aria-hidden="true"
				/>
			)}

			<aside
				className={cn(
					'fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-border bg-surface transition-transform duration-300 ease-out',
					'lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:shrink-0 lg:translate-x-0 lg:transition-none',
					mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
				)}>
				<div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-4">
					<PanelBrandMark icon={panelIcon} favicon={panelFavicon} size="sm" className="ring-0" />
					{panelTitle && (
						<span className="hidden min-w-0 flex-1 truncate text-sm font-semibold uppercase tracking-wide text-fg sm:block">
							{panelTitle}
						</span>
					)}
					<IconButton
						variant="ghost"
						size="sm"
						aria-label="Close navigation menu"
						onClick={onMobileClose}
						className="ml-auto lg:hidden">
						<X className="h-4 w-4" />
					</IconButton>
				</div>

				<nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Main navigation">
					<div className="space-y-0.5">
						{navElements.map(element => {
							if (element.type === 'ungrouped') {
								return (
									<NavItemButton
										key={`ungrouped-${element.item.type}-${element.item.slug}`}
										item={element.item}
										isActive={isItemActive(element.item)}
										onClick={() => handleItemClick(element.item)}
									/>
								);
							}

							const { group, items } = element;

							return (
								<div key={`group-${group}`} className="pt-4 first:pt-1">
									<p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-fg-muted">
										{group}
									</p>
									<div className="space-y-0.5">
										{items.map(item => (
											<NavItemButton
												key={`${item.type}-${item.slug}`}
												item={item}
												isActive={isItemActive(item)}
												onClick={() => handleItemClick(item)}
											/>
										))}
									</div>
								</div>
							);
						})}
					</div>
				</nav>
			</aside>
		</>
	);
}
