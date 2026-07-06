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
				if (recordId) {
					// Open the record modal directly. useModalUrlSync writes the address bar
					// (replaceState) from the modal stack, so we don't touch history here and
					// never call navigate() — that would unmount the current page. originUrl is
					// the URL to restore to when the modal is closed (see AdminPanel close handlers).
					const mode = deeplink.edit ? 'edit' : 'view';
					const originUrl = location.pathname + location.search;
					openModal(deeplink.resource, mode, recordId, undefined, undefined, originUrl);
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
