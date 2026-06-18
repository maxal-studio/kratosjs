import React, { createContext, useContext, useCallback, ReactNode } from 'react';

interface TableRefreshContextType {
	refreshTable: (resourceSlug: string) => void;
	registerRefresh: (resourceSlug: string, callback: () => void) => () => void;
}

const TableRefreshContext = createContext<TableRefreshContextType | undefined>(undefined);

export function TableRefreshProvider({ children }: { children: ReactNode }) {
	const refreshCallbacks = React.useRef<Map<string, () => void>>(new Map());

	const refreshTable = useCallback((resourceSlug: string) => {
		const callback = refreshCallbacks.current.get(resourceSlug);
		if (callback) {
			callback();
		}
	}, []);

	const registerRefresh = useCallback((resourceSlug: string, callback: () => void) => {
		refreshCallbacks.current.set(resourceSlug, callback);
		return () => {
			refreshCallbacks.current.delete(resourceSlug);
		};
	}, []);

	return (
		<TableRefreshContext.Provider value={{ refreshTable, registerRefresh }}>
			{children}
		</TableRefreshContext.Provider>
	);
}

export function useTableRefresh() {
	const context = useContext(TableRefreshContext);
	if (!context) {
		// Return no-op functions if context is not available
		return {
			refreshTable: () => {},
			registerRefresh: () => () => {},
		};
	}
	return context;
}
