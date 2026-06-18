import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormRenderer } from './FormRenderer';
import { FieldRegistryProvider } from './contexts/FieldRegistryContext';
import type { FieldProps } from './types';

// A custom field component an app registers without a plugin. In production this
// is wired via mountAdminPanel({ fields: { 'star-rating': StarRatingField } });
// here we feed it straight into the registry provider, which is the same path.
function StarRatingField(props: FieldProps) {
	return <div data-testid="star-rating">{props.label} stars</div>;
}

describe('FieldRenderer custom component registration', () => {
	it('renders a custom field registered via the field registry', () => {
		render(
			<FieldRegistryProvider customFields={{ 'star-rating': StarRatingField }}>
				<FormRenderer
					schema={{
						type: 'form',
						components: [{ type: 'star-rating', name: 'rating', label: 'Rating' }],
					}}
					onSubmit={vi.fn()}
				/>
			</FieldRegistryProvider>,
		);

		expect(screen.getByTestId('star-rating')).toBeInTheDocument();
		expect(screen.getByText(/rating stars/i)).toBeInTheDocument();
	});

	it('still warns for a field type that is not registered', () => {
		render(
			<FieldRegistryProvider customFields={{ 'star-rating': StarRatingField }}>
				<FormRenderer
					schema={{ type: 'form', components: [{ type: 'mystery', name: 'x' }] }}
					onSubmit={vi.fn()}
				/>
			</FieldRegistryProvider>,
		);

		expect(screen.getByText(/unknown field type "mystery"/i)).toBeInTheDocument();
	});
});
