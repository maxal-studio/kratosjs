import React, { createContext, useContext, ReactNode } from 'react';
import type { ResourceMetadata } from '../components/layout/Sidebar';

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

interface PanelMetadataContextType {
	resources: ResourceMetadata[];
	pages: PageMetadata[];
	getResourceLabel: (slug: string) => string | undefined;
	getPageLabel: (slug: string) => string | undefined;
}

const PanelMetadataContext = createContext<PanelMetadataContextType | undefined>(undefined);

export interface PanelMetadataProviderProps {
	children: ReactNode;
	resources: ResourceMetadata[];
	pages: PageMetadata[];
}

export function PanelMetadataProvider({ children, resources, pages }: PanelMetadataProviderProps) {
	const getResourceLabel = (slug: string): string | undefined => {
		const resource = resources.find(r => r.slug === slug);
		return resource?.label;
	};

	const getPageLabel = (slug: string): string | undefined => {
		const page = pages.find(p => p.slug === slug);
		return page?.label;
	};

	return (
		<PanelMetadataContext.Provider
			value={{
				resources,
				pages,
				getResourceLabel,
				getPageLabel,
			}}>
			{children}
		</PanelMetadataContext.Provider>
	);
}

export function usePanelMetadata() {
	const context = useContext(PanelMetadataContext);
	if (!context) {
		throw new Error('usePanelMetadata must be used within PanelMetadataProvider');
	}
	return context;
}
