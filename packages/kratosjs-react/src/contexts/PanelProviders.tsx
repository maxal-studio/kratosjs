import React from 'react';
import { AuthProvider } from '../auth/AuthContext';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { ResourceModalProvider } from './ResourceModalContext';
import { TableRefreshProvider } from './TableRefreshContext';
import { BlockRegistryProvider, BlockRegistry } from './BlockRegistryContext';
import { WidgetRegistryProvider, WidgetRegistry } from './WidgetRegistryContext';
import { FieldRegistryProvider } from './FieldRegistryContext';
import { ColumnRegistryProvider, ColumnRegistry } from './ColumnRegistryContext';
import { AuthChallengeRegistryProvider, AuthChallengeRegistry } from './AuthChallengeRegistryContext';
import { SlotRegistryProvider } from './SlotRegistryContext';
import type { ResolvedSlots } from '../slots/types';
import { ToastProvider } from '../components/ui/Toast';
import { ConfirmProvider } from '../components/ui/ConfirmDialog';
import { I18nProvider } from '../i18n/I18nProvider';
import type { ClientI18nConfig } from '../i18n/buildClientI18n';
import type { KratosPluginClient } from '../plugin';
import { FieldRegistry } from '../types';

export interface PanelProvidersProps {
	apiBaseUrl: string;
	customFields?: FieldRegistry;
	customColumns?: ColumnRegistry;
	customWidgets?: WidgetRegistry;
	customBlocks?: BlockRegistry;
	customAuthChallenges?: AuthChallengeRegistry;
	customSlots?: ResolvedSlots;
	i18nConfig?: ClientI18nConfig;
	plugins?: KratosPluginClient[];
	children: React.ReactNode;
}

/**
 * Composes the auth gate and every panel-level provider (modal stack,
 * table refresh, and the component registries) in one place.
 *
 * The auth-challenge registry wraps the auth gate so the LoginPage — rendered by
 * ProtectedRoute when there is no user — can resolve the component for a pending challenge.
 */
export function PanelProviders({
	apiBaseUrl,
	customFields,
	customColumns,
	customWidgets,
	customBlocks,
	customAuthChallenges,
	customSlots,
	i18nConfig,
	plugins,
	children,
}: PanelProvidersProps) {
	return (
		<I18nProvider config={i18nConfig} plugins={plugins}>
			<ToastProvider>
				<ConfirmProvider>
					<AuthProvider apiBaseUrl={apiBaseUrl}>
						<AuthChallengeRegistryProvider customAuthChallenges={customAuthChallenges}>
							{/*
							 * SlotRegistryProvider wraps ProtectedRoute so the LoginPage —
							 * rendered as ProtectedRoute's unauthenticated fallback — can
							 * resolve the `login.belowForm` slot. It only supplies the slot
							 * map; contributions render at their <Slot> call site and inherit
							 * whatever providers sit above that location.
							 */}
							<SlotRegistryProvider slots={customSlots}>
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
							</SlotRegistryProvider>
						</AuthChallengeRegistryProvider>
					</AuthProvider>
				</ConfirmProvider>
			</ToastProvider>
		</I18nProvider>
	);
}
