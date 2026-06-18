import React from 'react';
import { AuthProvider } from '../auth/AuthContext';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { ResourceModalProvider } from './ResourceModalContext';
import { TableRefreshProvider } from './TableRefreshContext';
import { BlockRegistryProvider, BlockRegistry } from './BlockRegistryContext';
import { WidgetRegistryProvider, WidgetRegistry } from './WidgetRegistryContext';
import { FieldRegistryProvider } from './FieldRegistryContext';
import { ColumnRegistryProvider, ColumnRegistry } from './ColumnRegistryContext';
import { ToastProvider } from '../components/ui/Toast';
import { ConfirmProvider } from '../components/ui/ConfirmDialog';
import { FieldRegistry } from '../types';

export interface PanelProvidersProps {
	apiBaseUrl: string;
	customFields?: FieldRegistry;
	customColumns?: ColumnRegistry;
	customWidgets?: WidgetRegistry;
	customBlocks?: BlockRegistry;
	children: React.ReactNode;
}

/**
 * Composes the auth gate and every panel-level provider (modal stack,
 * table refresh, and the four component registries) in one place.
 */
export function PanelProviders({
	apiBaseUrl,
	customFields,
	customColumns,
	customWidgets,
	customBlocks,
	children,
}: PanelProvidersProps) {
	return (
		<ToastProvider>
			<ConfirmProvider>
				<AuthProvider apiBaseUrl={apiBaseUrl}>
					<ProtectedRoute apiBaseUrl={apiBaseUrl}>
						<ResourceModalProvider>
							<TableRefreshProvider>
								<BlockRegistryProvider customBlocks={customBlocks}>
									<WidgetRegistryProvider customWidgets={customWidgets}>
										<FieldRegistryProvider customFields={customFields}>
											<ColumnRegistryProvider registry={customColumns}>
												{children}
											</ColumnRegistryProvider>
										</FieldRegistryProvider>
									</WidgetRegistryProvider>
								</BlockRegistryProvider>
							</TableRefreshProvider>
						</ResourceModalProvider>
					</ProtectedRoute>
				</AuthProvider>
			</ConfirmProvider>
		</ToastProvider>
	);
}
