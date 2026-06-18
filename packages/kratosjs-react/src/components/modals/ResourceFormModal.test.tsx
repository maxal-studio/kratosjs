import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ResourceFormModal } from './ResourceFormModal';
import { ResourceModalProvider } from '../../contexts/ResourceModalContext';
import { PanelMetadataProvider } from '../../contexts/PanelMetadataContext';
import { FieldRegistryProvider } from '../../contexts/FieldRegistryContext';
import { mockFetch, restoreFetch, RecordedRequest } from '../../test/mockFetch';

const API = 'http://api.test/admin';

const formSchema = {
	type: 'form',
	components: [{ type: 'text-input', name: 'name', label: 'Name' }],
} as any;

function renderModal(props: Partial<React.ComponentProps<typeof ResourceFormModal>> = {}) {
	return render(
		<MemoryRouter>
			<ResourceModalProvider>
				<PanelMetadataProvider
					resources={[{ slug: 'users', label: 'User', pluralLabel: 'Users' } as any]}
					pages={[]}>
					<FieldRegistryProvider>
						<ResourceFormModal
							isOpen
							onClose={() => {}}
							mode="create"
							resourceSlug="users"
							apiBaseUrl={API}
							formSchema={formSchema}
							{...props}
						/>
					</FieldRegistryProvider>
				</PanelMetadataProvider>
			</ResourceModalProvider>
		</MemoryRouter>,
	);
}

describe('ResourceFormModal', () => {
	let requests: RecordedRequest[];

	beforeEach(() => {
		localStorage.clear();
		requests = mockFetch([
			{ match: '/users/update/7', body: { data: { id: 7, name: 'Updated' }, metadata: {} } },
			{ match: '/users/7', body: { data: { id: 7, name: 'Jane' }, metadata: { recordTitle: 'Jane' } } },
			{ match: '/users', method: 'POST', body: { data: { id: 9, name: 'New' }, metadata: {} } },
		]);
	});

	afterEach(() => {
		restoreFetch();
	});

	it('create mode: shows the title, submits the payload and calls onSuccess + onClose', async () => {
		const user = userEvent.setup();
		const onSuccess = vi.fn();
		const onClose = vi.fn();
		renderModal({ onSuccess, onClose });

		expect(screen.getByText('Create User')).toBeInTheDocument();

		await user.type(screen.getByLabelText(/name/i), 'New');
		await user.click(screen.getByRole('button', { name: /submit/i }));

		await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ id: 9 })));
		expect(onClose).toHaveBeenCalled();

		const createRequest = requests.find(r => r.method === 'POST' && r.url.endsWith('/users'));
		expect(createRequest?.body).toMatchObject({ name: 'New' });
	});

	it('edit mode: prefills from the fetched record and posts to the update endpoint', async () => {
		const user = userEvent.setup();
		const onSuccess = vi.fn();
		renderModal({ mode: 'edit', recordId: 7, onSuccess });

		// Title uses the fetched record title
		expect(await screen.findByText('Editing "Jane"')).toBeInTheDocument();
		const input = (await screen.findByLabelText(/name/i)) as HTMLInputElement;
		await waitFor(() => expect(input.value).toBe('Jane'));

		await user.clear(input);
		await user.type(input, 'Updated');
		await user.click(screen.getByRole('button', { name: /submit/i }));

		await waitFor(() => expect(onSuccess).toHaveBeenCalled());
		const updateRequest = requests.find(r => r.url.includes('/users/update/7'));
		expect(updateRequest?.body).toMatchObject({ name: 'Updated' });
	});

	it('shows a server error message on failed submission', async () => {
		restoreFetch();
		mockFetch([{ match: '/users', method: 'POST', status: 422, body: { message: 'Name already taken' } }]);

		const user = userEvent.setup();
		const onClose = vi.fn();
		renderModal({ onClose });

		await user.click(screen.getByRole('button', { name: /submit/i }));
		expect(await screen.findByText('Name already taken')).toBeInTheDocument();
		expect(onClose).not.toHaveBeenCalled();
	});

	it('applies transformPayload before submitting', async () => {
		const user = userEvent.setup();
		renderModal({ transformPayload: data => ({ ...data, parentId: 'p1' }) });

		await user.click(screen.getByRole('button', { name: /submit/i }));
		await waitFor(() => {
			const createRequest = requests.find(r => r.method === 'POST' && r.url.endsWith('/users'));
			expect(createRequest?.body).toMatchObject({ parentId: 'p1' });
		});
	});
});
