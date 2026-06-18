import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface ModalState {
	resource: string;
	recordId?: string; // Optional for create mode
	mode: 'view' | 'edit' | 'create' | 'action';
	depth: number;
	// For action modals
	actionName?: string;
	actionLabel?: string;
	// Set by cross-resource deeplinks: the URL that was active before pushState was
	// called to show this modal's URL.  Used to restore the URL on close without
	// touching React Router's internal location.
	originUrl?: string;
}

interface ResourceModalContextType {
	modalStack: ModalState[];
	modalTitles: Record<string, string>;
	openModal: (
		resource: string,
		mode: 'view' | 'edit' | 'create' | 'action',
		recordId?: string,
		actionName?: string,
		actionLabel?: string,
		originUrl?: string,
	) => void;
	closeModal: () => void; // Closes top modal (pop from stack)
	closeAllModals: () => void;
	clearModalsForResource: (resource: string) => void; // Clear modals for specific resource when navigating away
	setModalTitle: (key: string, title: string) => void;
	removeModalTitle: (key: string) => void;
	clearModalTitles: () => void;
}

const ResourceModalContext = createContext<ResourceModalContextType | undefined>(undefined);

export function ResourceModalProvider({ children }: { children: ReactNode }) {
	const [modalStack, setModalStack] = useState<ModalState[]>([]);
	const [modalTitles, setModalTitles] = useState<Record<string, string>>({});

	const openModal = useCallback(
		(
			resource: string,
			mode: 'view' | 'edit' | 'create' | 'action',
			recordId?: string,
			actionName?: string,
			actionLabel?: string,
			originUrl?: string,
		) => {
			setModalStack(prev => {
				// Check if this exact modal is already at the top of the stack (prevent duplicates)
				const topModal = prev[prev.length - 1];
				if (
					topModal &&
					topModal.resource === resource &&
					topModal.recordId === recordId &&
					topModal.mode === mode &&
					topModal.actionName === actionName
				) {
					// Same modal already at top, don't add duplicate
					return prev;
				}

				// Add new modal to stack with auto-calculated depth
				const newModal: ModalState = {
					resource,
					recordId,
					mode,
					depth: prev.length, // depth = current stack length
					actionName,
					actionLabel,
					originUrl,
				};

				return [...prev, newModal];
			});
		},
		[],
	);

	const closeModal = useCallback(() => {
		setModalStack(prev => {
			if (prev.length === 0) return prev;
			// Remove last modal from stack (pop)
			return prev.slice(0, -1);
		});
	}, []);

	const closeAllModals = useCallback(() => {
		setModalStack([]);
	}, []);

	const clearModalsForResource = useCallback((resource: string) => {
		setModalStack(prev => prev.filter(modal => modal.resource !== resource));
	}, []);

	const setModalTitle = useCallback((key: string, title: string) => {
		setModalTitles(prev => ({ ...prev, [key]: title }));
	}, []);

	const removeModalTitle = useCallback((key: string) => {
		setModalTitles(prev => {
			const { [key]: _, ...rest } = prev;
			return rest;
		});
	}, []);

	const clearModalTitles = useCallback(() => {
		setModalTitles({});
	}, []);

	return (
		<ResourceModalContext.Provider
			value={{
				modalStack,
				modalTitles,
				openModal,
				closeModal,
				closeAllModals,
				clearModalsForResource,
				setModalTitle,
				removeModalTitle,
				clearModalTitles,
			}}>
			{children}
		</ResourceModalContext.Provider>
	);
}

export function useResourceModal() {
	const context = useContext(ResourceModalContext);
	if (!context) {
		throw new Error('useResourceModal must be used within ResourceModalProvider');
	}
	return context;
}
