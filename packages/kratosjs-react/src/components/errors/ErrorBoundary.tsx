import React from 'react';
import { PillButton } from '../ui/PillButton';
import { translate } from '../../i18n/activeLocale';

export interface ErrorBoundaryProps {
	children: React.ReactNode;
	/** Custom fallback; receives the error and a reset callback */
	fallback?: (error: Error, reset: () => void) => React.ReactNode;
	/** Short label for the failed area, shown in the default fallback */
	label?: string;
}

interface ErrorBoundaryState {
	error: Error | null;
}

/**
 * Generic error boundary so a crash in one route, modal or widget
 * doesn't take down the whole admin panel.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
	state: ErrorBoundaryState = { error: null };

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { error };
	}

	componentDidCatch(error: Error, info: React.ErrorInfo) {
		console.error('KratosJS error boundary caught:', error, info.componentStack);
	}

	reset = () => {
		this.setState({ error: null });
	};

	render() {
		const { error } = this.state;
		if (!error) {
			return this.props.children;
		}

		if (this.props.fallback) {
			return this.props.fallback(error, this.reset);
		}

		return (
			<div className="m-4 rounded-lg border border-danger/30 bg-danger-soft p-4">
				<p className="text-sm font-semibold text-danger">
					{this.props.label ? `Something went wrong in ${this.props.label}` : 'Something went wrong'}
				</p>
				<p className="mt-1 text-sm k-text-secondary break-words">{error.message}</p>
				<PillButton type="button" variant="default" onClick={this.reset} className="mt-3">
					{translate('core:common.try_again')}
				</PillButton>
			</div>
		);
	}
}
