import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormRenderer } from '../../FormRenderer';
import { authenticatedFetch } from '../../api/authenticatedFetch';
import { handleRedirect } from '../../utils/redirectHandler';
import { translate } from '../../i18n/activeLocale';

export interface FormBlockRendererProps {
	block: any;
	apiBaseUrl?: string;
}

export function FormBlockRenderer({ block, apiBaseUrl }: FormBlockRendererProps) {
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [initialData, setInitialData] = useState<Record<string, any>>(block.initialData || {});
	const [loading, setLoading] = useState<boolean>(!!block.dataUrl);

	// Fetch initial data from dataUrl if provided
	useEffect(() => {
		const fetchInitialData = async () => {
			// If no dataUrl, use initialData directly (no fetch needed)
			if (!block.dataUrl) {
				setLoading(false);
				return;
			}

			setLoading(true);
			setError(null);

			try {
				if (!apiBaseUrl) {
					throw new Error('API base URL is required');
				}

				const dataUrl = `${apiBaseUrl}/${block.dataUrl}`;

				const response = await authenticatedFetch(
					dataUrl,
					{
						method: 'GET',
						headers: {
							'Content-Type': 'application/json',
						},
					},
					apiBaseUrl,
				);

				if (!response.ok) {
					if (response.status === 401) {
						setError('Unauthorized - Please login again');
						return;
					}
					const errorData = await response.json();
					const errorMsg = errorData.error || errorData.message || translate('core:error.fetch_form_data');
					setError(errorMsg);
					return;
				}

				const responseData = await response.json();
				// Use ONLY fetched data, don't merge with initialData
				// This prevents metadata from being included in form state
				setInitialData(responseData.data || responseData || {});
			} catch (err: any) {
				setError(err.message || translate('core:error.fetch_form_data_generic'));
				// On error, fall back to initialData if available
				if (block.initialData) {
					setInitialData(block.initialData);
				}
			} finally {
				setLoading(false);
			}
		};

		fetchInitialData();
	}, [block.dataUrl, block.initialData, apiBaseUrl]);

	useEffect(() => {
		// Reset success message after 3 seconds
		if (successMessage) {
			const timer = setTimeout(() => setSuccessMessage(null), 3000);
			return () => clearTimeout(timer);
		}
	}, [successMessage]);

	const handleSubmit = async (data: Record<string, any>) => {
		setError(null);
		setSuccessMessage(null);

		try {
			if (!apiBaseUrl) {
				throw new Error('API base URL is required');
			}

			const submitUrl = block.submitUrl ? `${apiBaseUrl}/${block.submitUrl}` : `${apiBaseUrl}/submit`;

			const response = await authenticatedFetch(
				submitUrl,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(data),
				},
				apiBaseUrl,
			);

			const responseData = await response.json();

			if (!response.ok) {
				if (response.status === 401) {
					setError('Unauthorized - Please login again');
					return;
				}
				// Extract error message from backend response
				const errorMsg = responseData.error || responseData.message || translate('core:error.submit_form');
				setError(errorMsg);
				return;
			}

			// Check for redirect before showing success message
			if (handleRedirect(responseData, navigate)) {
				// Redirect was handled, exit early
				return;
			}

			// Extract success message from backend response
			const successMsg = responseData.message || translate('core:form.submitted');
			setSuccessMessage(successMsg);
		} catch (err: any) {
			setError(err.message || translate('core:error.generic'));
		}
	};

	return (
		<>
			{error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>}
			{successMessage && (
				<div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded">
					{successMessage}
				</div>
			)}
			{loading && (
				<div className="mb-4 p-3 bg-accent-soft border border-accent/30 text-accent rounded">
					Loading form data...
				</div>
			)}
			{!loading && (
				<FormRenderer
					schema={block.form}
					defaultValues={initialData}
					onSubmit={handleSubmit}
					apiBaseUrl={apiBaseUrl}
				/>
			)}
		</>
	);
}
