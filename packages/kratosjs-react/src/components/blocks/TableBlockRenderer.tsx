import React from 'react';
import { TableRenderer } from '../../TableRenderer';
import { cn } from '../../utils/classNames';

export interface TableBlockRendererProps {
	block: any;
	apiBaseUrl?: string;
}

export function TableBlockRenderer({ block, apiBaseUrl }: TableBlockRendererProps) {
	const dataUrl = block.dataUrl
		? apiBaseUrl
			? `${apiBaseUrl}/${block.dataUrl}`
			: block.dataUrl
		: apiBaseUrl
			? `${apiBaseUrl}/custom/list`
			: undefined;

	return (
		<>
			{dataUrl && (
				<TableRenderer
					isResource={false}
					schema={block.table}
					apiUrl={dataUrl}
					apiBaseUrl={apiBaseUrl}
					onCreateClick={undefined}
					canCreate={false}
				/>
			)}
		</>
	);
}
