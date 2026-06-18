import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormRenderer } from './FormRenderer';
import { FieldRegistryProvider } from './contexts/FieldRegistryContext';

function renderForm(schema: any, onSubmit = vi.fn(), defaultValues?: Record<string, any>) {
	render(
		<FieldRegistryProvider>
			<FormRenderer schema={schema} onSubmit={onSubmit} defaultValues={defaultValues} />
		</FieldRegistryProvider>,
	);
	return onSubmit;
}

describe('FormRenderer', () => {
	it('renders basic field types', () => {
		renderForm({
			type: 'form',
			components: [
				{ type: 'text-input', name: 'name', label: 'Name' },
				{ type: 'textarea', name: 'bio', label: 'Bio' },
				{ type: 'checkbox', name: 'agree', label: 'Agree' },
				{ type: 'hidden', name: 'secret', default: 'x' },
			],
		});

		expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/bio/i)).toBeInTheDocument();
		expect(screen.getByText('Agree')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
	});

	it('shows a warning box for unknown field types', () => {
		renderForm({ type: 'form', components: [{ type: 'does-not-exist', name: 'x' }] });
		expect(screen.getByText(/unknown field type "does-not-exist"/i)).toBeInTheDocument();
	});

	it('submits values including schema defaults', async () => {
		const user = userEvent.setup();
		const onSubmit = renderForm({
			type: 'form',
			components: [
				{ type: 'text-input', name: 'name', label: 'Name' },
				{ type: 'hidden', name: 'kind', default: 'admin' },
			],
		});

		await user.type(screen.getByLabelText(/name/i), 'Jane');
		await user.click(screen.getByRole('button', { name: /submit/i }));

		await waitFor(() => expect(onSubmit).toHaveBeenCalled());
		expect(onSubmit.mock.calls[0][0]).toMatchObject({ name: 'Jane', kind: 'admin' });
	});

	it('extracts nested defaults from sections and groups', async () => {
		const user = userEvent.setup();
		const onSubmit = renderForm({
			type: 'form',
			components: [
				{
					type: 'section',
					name: 'main',
					heading: 'Main',
					isLayout: true,
					childScope: 'inherit',
					schema: [{ type: 'text-input', name: 'inner', label: 'Inner', default: 'preset' }],
				},
			],
		});

		await user.click(screen.getByRole('button', { name: /submit/i }));
		await waitFor(() => expect(onSubmit).toHaveBeenCalled());
		expect(onSubmit.mock.calls[0][0]).toMatchObject({ inner: 'preset' });
	});

	it('seeds repeater rows from minItems', async () => {
		const user = userEvent.setup();
		const onSubmit = renderForm({
			type: 'form',
			components: [
				{
					type: 'repeater',
					name: 'items',
					label: 'Items',
					minItems: 2,
					childScope: 'array',
					schema: [{ type: 'text-input', name: 'title', label: 'Title', default: 't' }],
				},
			],
		});

		await user.click(screen.getByRole('button', { name: /submit/i }));
		await waitFor(() => expect(onSubmit).toHaveBeenCalled());
		expect(onSubmit.mock.calls[0][0].items).toEqual([{ title: 't' }, { title: 't' }]);
	});

	it('extracts defaults from a custom (plugin) container via the declarative contract', async () => {
		const user = userEvent.setup();
		// The core has no renderer for 'custom-fieldset', so FieldRenderer warns and falls back;
		// the default-extraction contract under test still runs.
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const onSubmit = renderForm({
			type: 'form',
			components: [
				{
					// A container type the core does not know about — discovered purely via metadata.
					type: 'custom-fieldset',
					isLayout: true,
					childScope: 'inherit',
					schema: [{ type: 'text-input', name: 'pluginValue', default: 'from-plugin' }],
				},
			],
		});

		await user.click(screen.getByRole('button', { name: /submit/i }));
		await waitFor(() => expect(onSubmit).toHaveBeenCalled());
		expect(onSubmit.mock.calls[0][0]).toMatchObject({ pluginValue: 'from-plugin' });
		expect(warnSpy).toHaveBeenCalledWith('Unknown field type: custom-fieldset');
		warnSpy.mockRestore();
	});

	it('accepts decimals and negatives for numeric fields', async () => {
		const user = userEvent.setup();
		const onSubmit = renderForm({
			type: 'form',
			components: [
				{ type: 'text-input', name: 'price', label: 'Price', validation: { rules: [{ rule: 'numeric' }] } },
			],
		});

		await user.type(screen.getByLabelText('Price'), '10.50');
		await user.click(screen.getByRole('button', { name: /submit/i }));

		// Submission would be blocked if the numeric rule rejected the decimal.
		await waitFor(() => expect(onSubmit).toHaveBeenCalled());
		expect(onSubmit.mock.calls[0][0]).toMatchObject({ price: '10.50' });
	});

	it('hides fields via a structured hiddenWhen condition', () => {
		renderForm({
			type: 'form',
			components: [
				{ type: 'text-input', name: 'status', label: 'Status', default: 'draft' },
				{
					type: 'text-input',
					name: 'publishedAt',
					label: 'Published at',
					hiddenWhen: { op: 'eq', field: 'status', value: 'draft' },
				},
			],
		});

		expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
		expect(screen.queryByLabelText(/published at/i)).not.toBeInTheDocument();
	});

	it('user-provided defaultValues override schema defaults', async () => {
		const user = userEvent.setup();
		const onSubmit = renderForm(
			{
				type: 'form',
				components: [{ type: 'text-input', name: 'name', label: 'Name', default: 'schema-default' }],
			},
			vi.fn(),
			{ name: 'record-value' },
		);

		await user.click(screen.getByRole('button', { name: /submit/i }));
		await waitFor(() => expect(onSubmit).toHaveBeenCalled());
		expect(onSubmit.mock.calls[0][0]).toMatchObject({ name: 'record-value' });
	});
});
