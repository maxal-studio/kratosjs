import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, IconButton } from './Button';
import { Badge } from './Badge';
import { EmptyState } from './EmptyState';
import { ErrorAlert } from './ErrorAlert';

describe('Button', () => {
	it('renders variants with the right classes', () => {
		const { rerender } = render(<Button>Save</Button>);
		expect(screen.getByRole('button', { name: 'Save' })).toHaveClass('bg-accent');

		rerender(<Button variant="danger">Delete</Button>);
		expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('bg-danger');

		rerender(<Button variant="secondary">Cancel</Button>);
		expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass('bg-input');
	});

	it('defaults to type="button" so it does not submit forms accidentally', () => {
		render(<Button>Click</Button>);
		expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
	});

	it('disables itself while loading', async () => {
		const onClick = vi.fn();
		render(
			<Button loading onClick={onClick}>
				Saving
			</Button>,
		);
		const button = screen.getByRole('button');
		expect(button).toBeDisabled();
		await userEvent
			.setup()
			.click(button)
			.catch(() => {});
		expect(onClick).not.toHaveBeenCalled();
	});

	it('IconButton requires and applies the aria-label', () => {
		render(<IconButton aria-label="Close">x</IconButton>);
		expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
	});
});

describe('Badge', () => {
	it('applies variant classes', () => {
		render(<Badge variant="success">Active</Badge>);
		expect(screen.getByText('Active')).toHaveClass('bg-success-soft');
	});
});

describe('EmptyState', () => {
	it('renders title, description and action', () => {
		render(<EmptyState title="Nothing here" description="Try again later" action={<Button>Retry</Button>} />);
		expect(screen.getByText('Nothing here')).toBeInTheDocument();
		expect(screen.getByText('Try again later')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
	});
});

describe('ErrorAlert', () => {
	it('renders the message and dismiss button', async () => {
		const onDismiss = vi.fn();
		render(<ErrorAlert message="Something broke" onDismiss={onDismiss} />);
		expect(screen.getByRole('alert')).toHaveTextContent('Something broke');
		await userEvent.setup().click(screen.getByLabelText('Dismiss'));
		expect(onDismiss).toHaveBeenCalled();
	});

	it('renders nothing without a message', () => {
		const { container } = render(<ErrorAlert message="" />);
		expect(container).toBeEmptyDOMElement();
	});
});
