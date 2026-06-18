import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Moon, Sun, Menu, User, LogOut, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/classNames';
import { GlobalSearch } from '../GlobalSearch';
import { useAuth } from '../../auth/AuthContext';
import { usePanelMetadata } from '../../contexts/PanelMetadataContext';
import { IconButton } from '../ui';

export interface HeaderProps {
	panelId?: string;
	darkMode: boolean;
	onDarkModeToggle: () => void;
	onMobileMenuToggle?: () => void;
	apiBaseUrl?: string;
	globalSearchAvailable?: boolean;
}

function useCurrentPageTitle(): string | undefined {
	const location = useLocation();
	const { resources, pages } = usePanelMetadata();

	return useMemo(() => {
		if (location.pathname.startsWith('/page/')) {
			const slug = location.pathname.replace('/page/', '').split('/')[0];
			return pages.find(page => page.slug === slug)?.label;
		}

		const slug = location.pathname.split('/').filter(Boolean)[0];
		if (!slug) return undefined;

		const resource = resources.find(item => item.slug === slug);
		return resource?.pluralLabel ?? resource?.label;
	}, [location.pathname, resources, pages]);
}

export function Header({
	darkMode,
	onDarkModeToggle,
	onMobileMenuToggle,
	apiBaseUrl,
	globalSearchAvailable = false,
}: HeaderProps) {
	const { user, logout } = useAuth();
	const pageTitle = useCurrentPageTitle();
	const [userMenuOpen, setUserMenuOpen] = useState(false);
	const userMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
				setUserMenuOpen(false);
			}
		};

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setUserMenuOpen(false);
			}
		};

		if (userMenuOpen) {
			document.addEventListener('mousedown', handleClickOutside);
			document.addEventListener('keydown', handleEscape);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('keydown', handleEscape);
		};
	}, [userMenuOpen]);

	const handleLogout = async () => {
		await logout();
		setUserMenuOpen(false);
	};

	const userInitial = (user?.name || user?.email || '?').charAt(0).toUpperCase();

	return (
		<header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-base px-4 sm:px-6">
			<div className="flex min-w-0 flex-1 items-center gap-3">
				{onMobileMenuToggle && (
					<IconButton
						variant="ghost"
						size="sm"
						aria-label="Open navigation menu"
						onClick={onMobileMenuToggle}
						className="lg:hidden">
						<Menu className="h-5 w-5" />
					</IconButton>
				)}
				{pageTitle && (
					<h1 className="truncate text-lg font-semibold tracking-tight text-fg sm:text-xl">{pageTitle}</h1>
				)}
			</div>

			<div className="flex shrink-0 items-center gap-1 sm:gap-2">
				{apiBaseUrl && globalSearchAvailable && <GlobalSearch apiBaseUrl={apiBaseUrl} />}

				<IconButton
					variant="ghost"
					size="sm"
					aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
					title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
					onClick={onDarkModeToggle}
					className="h-9 w-9 shrink-0">
					<span className="inline-flex h-4 w-4 items-center justify-center">
						{darkMode ? (
							<Sun className="h-4 w-4 text-warning" />
						) : (
							<Moon className="h-4 w-4 text-fg-secondary" />
						)}
					</span>
				</IconButton>

				{user && (
					<div className="relative" ref={userMenuRef}>
						<button
							type="button"
							onClick={() => setUserMenuOpen(open => !open)}
							aria-expanded={userMenuOpen}
							aria-haspopup="menu"
							className={cn(
								'flex items-center gap-2 rounded-full border border-transparent py-1 pl-1 pr-2 transition-colors',
								'hover:border-border hover:bg-hover',
								'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
								userMenuOpen && 'border-border bg-hover',
							)}>
							{user.avatarUrl ? (
								<img
									src={user.avatarUrl}
									alt=""
									className="h-8 w-8 rounded-full object-cover ring-1 ring-border"
								/>
							) : (
								<div className="flex h-8 w-8 items-center justify-center rounded-full bg-raised text-xs font-semibold text-fg ring-1 ring-border">
									{userInitial}
								</div>
							)}
							<div className="hidden min-w-0 text-left md:block">
								<div className="max-w-[140px] truncate text-sm font-medium text-fg">
									{user.name || user.email}
								</div>
								{user.role && (
									<div className="max-w-[140px] truncate text-xs text-fg-muted">{user.role}</div>
								)}
							</div>
							<ChevronDown
								className={cn(
									'hidden h-4 w-4 text-fg-muted transition-transform md:block',
									userMenuOpen && 'rotate-180',
								)}
							/>
						</button>

						{userMenuOpen && (
							<div
								role="menu"
								className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-raised shadow-soft-lg">
								<div className="border-b border-border px-4 py-3">
									<div className="truncate text-sm font-medium text-fg">
										{user.name || user.email}
									</div>
									{user.email && user.name && (
										<div className="mt-0.5 truncate text-xs text-fg-muted">{user.email}</div>
									)}
									{user.role && (
										<div className="mt-1 inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-fg-secondary">
											{user.role}
										</div>
									)}
								</div>
								<div className="p-1">
									<button
										type="button"
										role="menuitem"
										onClick={handleLogout}
										className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-fg transition-colors hover:bg-hover">
										<LogOut className="h-4 w-4 text-fg-secondary" />
										Sign out
									</button>
								</div>
							</div>
						)}
					</div>
				)}

				{!user && (
					<div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
						<User className="h-4 w-4 text-fg-muted" />
					</div>
				)}
			</div>
		</header>
	);
}
