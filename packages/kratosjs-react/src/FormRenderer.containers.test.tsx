import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormBuilder, TextInput, Group, Tabs, Repeater } from '@maxal_studio/kratosjs';
import { FormRenderer } from './FormRenderer';
import { FieldRegistryProvider } from './contexts/FieldRegistryContext';

// Front-end counterpart to the backend container validation tests: rules on
// fields nested in containers (Group/Tabs and Repeater rows) must block submit,
// driven by the same shared engine the server uses.

function renderForm(schema: any, defaultValues?: Record<string, any>) {
	const onSubmit = vi.fn();
	render(
		<FieldRegistryProvider>
			<FormRenderer schema={schema} onSubmit={onSubmit} defaultValues={defaultValues} />
		</FieldRegistryProvider>,
	);
	return onSubmit;
}

const submit = () => userEvent.setup().click(screen.getByRole('button', { name: /submit/i }));

describe('FormRenderer validation in layout containers', () => {
	it('Group: a required nested field blocks submit and shows an error', async () => {
		const schema = FormBuilder.make()
			.schema([Group.make('g').schema([TextInput.make('email').label('Email').required().email()])])
			.toJSON();
		const onSubmit = renderForm(schema);

		await submit();

		await waitFor(() => expect(screen.getByText(/this field is required/i)).toBeInTheDocument());
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('Group: an invalid value on a nested field blocks submit', async () => {
		const schema = FormBuilder.make()
			.schema([Group.make('g').schema([TextInput.make('email').label('Email').required().email()])])
			.toJSON();
		const onSubmit = renderForm(schema);

		const user = userEvent.setup();
		await user.type(screen.getByLabelText(/email/i), 'not-an-email');
		await user.click(screen.getByRole('button', { name: /submit/i }));

		await waitFor(() => expect(screen.getByText(/valid email/i)).toBeInTheDocument());
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('Tabs: a rule on a field inside the active tab is enforced', async () => {
		const schema = FormBuilder.make()
			.schema([
				Tabs.make('t').tabs([
					{ label: 'A', schema: [TextInput.make('title').label('Title').required().min(3)] },
				]),
			])
			.toJSON();
		const onSubmit = renderForm(schema);

		const user = userEvent.setup();
		await user.type(screen.getByLabelText(/title/i), 'ab'); // below min:3
		await user.click(screen.getByRole('button', { name: /submit/i }));

		await waitFor(() => expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument());
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('Group: a fully valid nested field submits', async () => {
		const schema = FormBuilder.make()
			.schema([Group.make('g').schema([TextInput.make('email').label('Email').required().email()])])
			.toJSON();
		const onSubmit = renderForm(schema);

		const user = userEvent.setup();
		await user.type(screen.getByLabelText(/email/i), 'a@b.com');
		await user.click(screen.getByRole('button', { name: /submit/i }));

		await waitFor(() => expect(onSubmit).toHaveBeenCalled());
		expect(onSubmit.mock.calls[0][0]).toMatchObject({ email: 'a@b.com' });
	});
});

describe('FormRenderer validation in a Repeater row', () => {
	const schema = FormBuilder.make()
		.schema([Repeater.make('items').schema([TextInput.make('name').label('Name').required().min(3)])])
		.toJSON();

	it('an invalid row (empty required) blocks submit and shows the row error', async () => {
		// Seed one empty row so the row's fields render and register.
		const onSubmit = renderForm(schema, { items: [{ name: '' }] });

		// Row actually rendered (so the assertion is meaningful).
		expect(screen.getByLabelText(/name/i)).toBeInTheDocument();

		await submit();

		// The nested-name (items.0.name) error message now resolves and renders.
		await waitFor(() => expect(screen.getByText(/this field is required/i)).toBeInTheDocument());
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('a too-short row value (min:3) blocks submit and shows the row error', async () => {
		const onSubmit = renderForm(schema, { items: [{ name: 'ab' }] });

		await submit();

		await waitFor(() => expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument());
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('a valid row submits', async () => {
		const onSubmit = renderForm(schema, { items: [{ name: 'abc' }] });

		await submit();

		await waitFor(() => expect(onSubmit).toHaveBeenCalled());
		expect(onSubmit.mock.calls[0][0]).toMatchObject({ items: [{ name: 'abc' }] });
	});
});
