import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormRenderer } from '../FormRenderer';

const DOT_LABEL = 'Has validation errors or required fields';

const tab = (label: string, schema: any[]) => ({
	type: 'tab',
	isLayout: true,
	childScope: 'inherit',
	label,
	schema,
});

const tabsSchema: any = {
	type: 'form',
	components: [
		{
			type: 'tabs',
			isLayout: true,
			childScope: 'inherit',
			schema: [
				tab('General', [
					{
						type: 'text-input',
						name: 'email',
						label: 'Email',
						validation: { rules: [{ rule: 'email' }] },
					},
				]),
				tab('Content', [{ type: 'text-input', name: 'body', label: 'Body' }]),
			],
		},
	],
};

function renderTabsForm() {
	return render(<FormRenderer schema={tabsSchema} onSubmit={vi.fn()} />);
}

describe('TabsField navigation', () => {
	it('does not snap back to an error tab while editing (before submit)', async () => {
		const user = userEvent.setup();
		renderTabsForm();

		// Create a (non-required) validation error in the first tab.
		await user.type(screen.getByLabelText('Email'), 'not-an-email');

		// Manually navigate to the second tab — must stay there.
		await user.click(screen.getByRole('tab', { name: /content/i }));

		expect(screen.getByRole('tab', { name: /content/i })).toHaveAttribute('aria-selected', 'true');
		expect(screen.getByRole('tab', { name: /general/i })).toHaveAttribute('aria-selected', 'false');
	});

	it('jumps to the first tab with errors after a failed submit', async () => {
		const user = userEvent.setup();
		renderTabsForm();

		await user.type(screen.getByLabelText('Email'), 'not-an-email');
		await user.click(screen.getByRole('tab', { name: /content/i }));
		expect(screen.getByRole('tab', { name: /content/i })).toHaveAttribute('aria-selected', 'true');

		await user.click(screen.getByRole('button', { name: /^submit$/i }));

		await waitFor(() =>
			expect(screen.getByRole('tab', { name: /general/i })).toHaveAttribute('aria-selected', 'true'),
		);
	});

	it('lets the user navigate freely again after the post-submit jump', async () => {
		const user = userEvent.setup();
		renderTabsForm();

		await user.type(screen.getByLabelText('Email'), 'not-an-email');
		await user.click(screen.getByRole('button', { name: /^submit$/i }));

		// Jumped to the error tab...
		await waitFor(() =>
			expect(screen.getByRole('tab', { name: /general/i })).toHaveAttribute('aria-selected', 'true'),
		);

		// ...but the user can still move away and stay there (not locked).
		await user.click(screen.getByRole('tab', { name: /content/i }));
		expect(screen.getByRole('tab', { name: /content/i })).toHaveAttribute('aria-selected', 'true');
	});
});

const requiredDotSchema: any = {
	type: 'form',
	components: [
		{
			type: 'tabs',
			isLayout: true,
			childScope: 'inherit',
			schema: [
				tab('General', [
					{
						type: 'text-input',
						name: 'title',
						label: 'Title',
						validation: { rules: [{ rule: 'required' }] },
					},
					{
						type: 'select',
						name: 'status',
						label: 'Status',
						default: 'draft',
						options: { draft: 'Draft', published: 'Published' },
						validation: { rules: [{ rule: 'required' }] },
					},
				]),
				tab('Advanced', [
					{
						type: 'text-input',
						name: 'notes',
						label: 'Notes',
						validation: { rules: [{ rule: 'required' }] },
					},
				]),
			],
		},
	],
};

describe('TabsField required indicator', () => {
	it('shows required dots only after submit, and clears them reactively as fields are filled', async () => {
		const user = userEvent.setup();
		render(<FormRenderer schema={requiredDotSchema} onSubmit={vi.fn()} />);

		const general = () => screen.getByRole('tab', { name: /general/i });
		const advanced = () => screen.getByRole('tab', { name: /advanced/i });

		// Before any submit: no nagging dots, even though required fields are empty.
		expect(within(general()).queryByLabelText(DOT_LABEL)).not.toBeInTheDocument();
		expect(within(advanced()).queryByLabelText(DOT_LABEL)).not.toBeInTheDocument();

		// Submit with everything empty → both tabs flagged (title + notes missing).
		await user.click(screen.getByRole('button', { name: /^submit$/i }));
		await waitFor(() => expect(within(general()).queryByLabelText(DOT_LABEL)).toBeInTheDocument());
		expect(within(advanced()).queryByLabelText(DOT_LABEL)).toBeInTheDocument();

		// Fill General's required field → its dot clears (status already has a default);
		// the Advanced tab keeps its dot because `notes` is still empty.
		await user.type(screen.getByLabelText(/title/i), 'Hello');
		await waitFor(() => expect(within(general()).queryByLabelText(DOT_LABEL)).not.toBeInTheDocument());
		expect(within(advanced()).queryByLabelText(DOT_LABEL)).toBeInTheDocument();
	});
});
