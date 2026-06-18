import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SerializedColumn } from '@maxal_studio/kratosjs';
import { executeSerializedFunction } from '../../runtime/serializedFunctions';
import { useResourceModal } from '../../contexts/ResourceModalContext';

interface DeeplinkWrapperProps {
	column: SerializedColumn;
	record: Record<string, any>;
	value: any;
	children: React.ReactNode;
	className?: string;
}

/**
 * Reusable component that wraps content with deeplink navigation functionality
 * Uses an anchor tag for proper HTML content support and semantic correctness
 */
export function DeeplinkWrapper({ column, record, value, children, className = '' }: DeeplinkWrapperProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const { openModal } = useResourceModal();

	// Determine current resource from URL
	const getCurrentResource = () => {
		const pathParts = location.pathname.split('/').filter(Boolean);
		// First part after root is typically the resource slug
		return pathParts[0] || null;
	};

	// Check if deeplink exists
	if (!column.deeplink) {
		return <>{children}</>;
	}

	const handleClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		const deeplink = column.deeplink;
		if (!deeplink) return;

		try {
			// Get the record ID
			let recordId: string | undefined;

			if (deeplink.id) {
				// Static ID string
				recordId = deeplink.id;
			} else if (deeplink.idFn) {
				// Execute the serialized function to get the ID
				recordId = executeSerializedFunction(deeplink.idFn, value, record);
			}

			// Handle resource deeplinks
			if (deeplink.resource) {
				// Check if we're currently on the target resource page
				const currentPath = location.pathname;
				const isOnTargetResource = currentPath.startsWith(`/${deeplink.resource}`);

				if (recordId) {
					const mode = deeplink.edit ? 'edit' : 'view';
					const currentResource = getCurrentResource();
					const isSameResource = currentResource === deeplink.resource;

					if (isSameResource) {
						// Same resource: navigate to update URL (for bookmarking)
						// The URL listener in ResourceListPage will open the modal via context
						const path = deeplink.edit
							? `/${deeplink.resource}/${recordId}/edit`
							: `/${deeplink.resource}/${recordId}`;
						navigate(path);
					} else {
						// Cross-resource: push the target URL into browser history so the
						// address bar updates, but do NOT call navigate() — that would unmount
						// the current page.  Store the current URL as originUrl so AdminPanel
						// can restore it with replaceState when the modal closes.
						const originUrl = location.pathname + location.search;
						const targetPath = deeplink.edit
							? `/${deeplink.resource}/${recordId}/edit`
							: `/${deeplink.resource}/${recordId}`;
						window.history.pushState(null, '', targetPath);
						openModal(deeplink.resource, mode, recordId, undefined, undefined, originUrl);
					}
				} else {
					// No ID provided, navigate to resource list page
					navigate(`/${deeplink.resource}`);
				}
			} else if (deeplink.page) {
				// Page navigation
				navigate(`/page/${deeplink.page}`);
			}
		} catch (error) {
			console.error('Error handling deeplink:', error);
		}
	};

	return (
		<a href="#" onClick={handleClick} className={`cursor-pointer text-accent hover:underline ${className}`.trim()}>
			{children}
		</a>
	);
}
