import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TableRow } from '../table/TableRow';
import { ColumnRegistryProvider } from '../../contexts/ColumnRegistryContext';
import type { ColumnProps } from './TextColumnComponent';

// A custom column an app registers without a plugin. In production this is wired
// via mountAdminPanel({ columns: { 'star-rating': StarRatingColumn } }); here we
// feed it straight into the registry provider, which is the same path.
function StarRatingColumn({ column, record }: ColumnProps) {
	return <span data-testid="stars">{`${record[column.name]} / 5`}</span>;
}

const noop = () => {};

function renderRow(registry: Record<string, any>) {
	const column = { type: 'star-rating', name: 'rating' } as any;
	render(
		<ColumnRegistryProvider registry={registry}>
			<table>
				<tbody>
					<TableRow
						schema={{ columns: [column] } as any}
						row={{ rating: 4 }}
						rowIndex={0}
						totalRows={1}
						rowId={1}
						visibleColumns={[column]}
						isSelected={false}
						hasChanges={false}
						openActionsRowId={null}
						onRowSelect={noop}
						onCellChange={noop}
						onRowAction={noop}
						onSaveRow={noop}
						onResetRow={noop}
						onToggleActions={noop}
					/>
				</tbody>
			</table>
		</ColumnRegistryProvider>,
	);
}

describe('TableRow custom column registration', () => {
	it('renders a custom column registered via the column registry', () => {
		renderRow({ 'star-rating': StarRatingColumn });
		expect(screen.getByTestId('stars')).toHaveTextContent('4 / 5');
	});

	it('falls back to the unknown-column cell when the type is not registered', () => {
		renderRow({});
		expect(screen.getByText(/unknown column type: star-rating/i)).toBeInTheDocument();
	});
});
