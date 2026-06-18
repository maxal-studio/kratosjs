import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { TableRenderer } from './TableRenderer';
import { ResourceModalProvider } from '../contexts/ResourceModalContext';
import { mockFetch, restoreFetch, RecordedRequest } from '../test/mockFetch';

const API = 'http://api.test/admin';

const tableSchema = {
	resource: 'users',
	searchable: true,
	recordsPerPage: 10,
	columns: [
		{ name: 'name', label: 'Name', type: 'text' },
		{ name: 'email', label: 'Email', type: 'text' },
	],
	actions: [],
	bulkActions: [],
} as any;

function renderTable(props: Partial<React.ComponentProps<typeof TableRenderer>> = {}) {
	return render(
		<MemoryRouter>
			<ResourceModalProvider>
				<TableRenderer isResource apiUrl={`${API}/users`} schema={tableSchema} {...props} />
			</ResourceModalProvider>
		</MemoryRouter>,
	);
}

describe('TableRenderer', () => {
	let requests: RecordedRequest[];

	beforeEach(() => {
		localStorage.clear();
		requests = mockFetch([
			{
				match: '/users/list',
				body: (_url, init) => {
					const params = JSON.parse((init?.body as string) || '{}');
					const rows = params.search
						? [{ id: 1, name: 'Jane', email: 'jane@max.al' }]
						: [
								{ id: 1, name: 'Jane', email: 'jane@max.al' },
								{ id: 2, name: 'Bob', email: 'bob@max.al' },
							];
					return {
						data: rows,
						pagination: {
							page: 1,
							limit: 10,
							total: rows.length,
							pages: 1,
							hasNext: false,
							hasPrev: false,
						},
					};
				},
			},
		]);
	});

	afterEach(() => {
		restoreFetch();
	});

	it('loads and renders rows', async () => {
		renderTable();
		expect(await screen.findByText('Jane')).toBeInTheDocument();
		expect(screen.getByText('Bob')).toBeInTheDocument();

		const listRequests = requests.filter(r => r.url.includes('/users/list'));
		expect(listRequests.length).toBeGreaterThan(0);
		expect(listRequests[0].body).toMatchObject({ page: 1, perPage: 10 });
	});

	it('sends the search term in the request payload', async () => {
		const user = userEvent.setup();
		renderTable();
		await screen.findByText('Bob');

		// TableSearchBar renders separate inputs for mobile and desktop
		const searchInput = screen.getAllByPlaceholderText(/search/i)[0];
		await user.type(searchInput, 'jane');

		await waitFor(() => {
			const last = requests.filter(r => r.url.includes('/users/list')).pop();
			expect(last?.body).toMatchObject({ search: 'jane', page: 1 });
		});
		await waitFor(() => expect(screen.queryByText('Bob')).not.toBeInTheDocument());
	});

	it('shows an empty state when there are no rows', async () => {
		restoreFetch();
		mockFetch([
			{
				match: '/users/list',
				body: {
					data: [],
					pagination: { page: 1, limit: 10, total: 0, pages: 0, hasNext: false, hasPrev: false },
				},
			},
		]);
		renderTable();
		expect(await screen.findByText('No records found')).toBeInTheDocument();
	});

	it('shows the error alert when the request fails', async () => {
		restoreFetch();
		mockFetch([{ match: '/users/list', status: 500, body: { message: 'Database exploded' } }]);
		renderTable();
		expect(await screen.findByText('Database exploded')).toBeInTheDocument();
	});

	it('derives view/edit/delete row actions from capabilities, with custom actions in between', async () => {
		const user = userEvent.setup();
		// No built-in actions declared — only a custom one. Capabilities default to true.
		renderTable({
			schema: {
				...tableSchema,
				actions: [{ type: 'action', name: 'archive', label: 'Archive', icon: 'Archive', hasHandler: true }],
			} as any,
		});

		await screen.findByText('Jane');

		// Open the first row's actions dropdown.
		const toggles = screen.getAllByRole('button', { name: /row actions/i });
		await user.click(toggles[0]);

		const view = await screen.findByText('View');
		const edit = screen.getByText('Edit');
		const archive = screen.getByText('Archive');
		const del = screen.getByText('Delete');

		expect(view).toBeInTheDocument();
		// Order: view, edit, …custom, delete
		expect(edit.compareDocumentPosition(archive) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(archive.compareDocumentPosition(del) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it('omits row actions disabled by capability flags', async () => {
		const user = userEvent.setup();
		renderTable({ canEdit: false, canDelete: false });

		await screen.findByText('Jane');
		const toggles = screen.getAllByRole('button', { name: /row actions/i });
		await user.click(toggles[0]);

		expect(await screen.findByText('View')).toBeInTheDocument();
		expect(screen.queryByText('Edit')).not.toBeInTheDocument();
		expect(screen.queryByText('Delete')).not.toBeInTheDocument();
	});

	it('renders header actions and triggers an export download on click', async () => {
		// jsdom does not implement object URLs; stub them for the download helper.
		const createObjectURL = vi.fn(() => 'blob:mock');
		const revokeObjectURL = vi.fn();
		(URL as any).createObjectURL = createObjectURL;
		(URL as any).revokeObjectURL = revokeObjectURL;
		// jsdom logs "Not implemented: navigation" when the download anchor is clicked.
		const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

		restoreFetch();
		const exportRequests = mockFetch([
			{
				match: '/users/list',
				body: {
					data: [{ id: 1, name: 'Jane', email: 'jane@max.al' }],
					pagination: { page: 1, limit: 10, total: 1, pages: 1, hasNext: false, hasPrev: false },
				},
			},
			{ match: '/users/export', body: 'Name,Email\nJane,jane@max.al\n' },
		]);

		const schemaWithHeaderAction = {
			...tableSchema,
			headerActions: [{ type: 'action', name: 'exportCsv', label: 'Export', export: 'csv' }],
		} as any;

		const user = userEvent.setup();
		renderTable({ schema: schemaWithHeaderAction });

		const exportButton = await screen.findByRole('button', { name: /export/i });
		await user.click(exportButton);

		await waitFor(() => {
			const exportCall = exportRequests.find(r => r.url.includes('/users/export'));
			expect(exportCall?.body).toMatchObject({ format: 'csv' });
		});
		expect(createObjectURL).toHaveBeenCalled();
		expect(clickSpy).toHaveBeenCalled();
	});
});
