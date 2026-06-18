import { useEffect, useRef, useState } from 'react';
import { SerializedTable } from '@maxal_studio/kratosjs';
import { getRecord, getRelations, getTableSchema } from '../../../api/resourceApi';
import { SerializedRelation } from '../../../types';
import { useResourceModal } from '../../../contexts/ResourceModalContext';

export interface RecordViewApi {
	recordData: any;
	recordTitle: string | undefined;
	relations: SerializedRelation[];
	relationSchemas: Record<string, SerializedTable>;
	loading: boolean;
	error: string | null;
	/** Re-fetch only the record (after edits/actions) */
	refreshRecord: () => Promise<void>;
}

/**
 * Data layer of the view modal: loads the record, its relation metadata and
 * the relation table schemas, and refreshes the record whenever a
 * data-mutating modal (edit/create/action) above it closes.
 */
export function useRecordView(
	isOpen: boolean,
	apiBaseUrl: string | undefined,
	resourceSlug: string,
	recordId: string,
): RecordViewApi {
	const { modalStack } = useResourceModal();
	const [recordData, setRecordData] = useState<any>(null);
	const [recordTitle, setRecordTitle] = useState<string | undefined>(undefined);
	const [relations, setRelations] = useState<SerializedRelation[]>([]);
	const [relationSchemas, setRelationSchemas] = useState<Record<string, SerializedTable>>({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const prevModalStackRef = useRef(modalStack);

	const fetchRecord = async () => {
		const result = await getRecord(apiBaseUrl!, resourceSlug, recordId);
		setRecordData(result.data);
		setRecordTitle(result.metadata?.recordTitle);
	};

	const refreshRecord = async () => {
		if (!isOpen || !recordId) return;
		setLoading(true);
		setError(null);
		try {
			await fetchRecord();
		} catch (err: any) {
			setError(err.message || 'Failed to load record');
		} finally {
			setLoading(false);
		}
	};

	// Initial load: record + relations + relation table schemas (in parallel)
	useEffect(() => {
		if (!isOpen) return;

		let cancelled = false;
		const fetchAll = async () => {
			setLoading(true);
			setError(null);
			try {
				const recordPromise = getRecord(apiBaseUrl!, resourceSlug, recordId);
				const relationsPromise = getRelations(apiBaseUrl!, resourceSlug).catch(() => []);

				const record = await recordPromise;
				if (cancelled) return;
				setRecordData(record.data);
				setRecordTitle(record.metadata?.recordTitle);

				const rels: SerializedRelation[] = await relationsPromise;
				if (cancelled) return;
				setRelations(rels);

				const schemaResults = await Promise.all(
					rels.map(async relation => {
						try {
							const schema = await getTableSchema(apiBaseUrl!, relation.resourceSlug);
							return { relationName: relation.name, schema: schema as SerializedTable };
						} catch {
							return { relationName: relation.name, schema: null };
						}
					}),
				);
				if (cancelled) return;
				const schemas: Record<string, SerializedTable> = {};
				for (const { relationName, schema } of schemaResults) {
					if (schema) schemas[relationName] = schema;
				}
				setRelationSchemas(schemas);
			} catch (err: unknown) {
				if (!cancelled) setError(err instanceof Error ? err.message : String(err));
			} finally {
				if (!cancelled) setLoading(false);
			}
		};

		fetchAll();
		return () => {
			cancelled = true;
		};
	}, [isOpen, resourceSlug, recordId, apiBaseUrl]);

	// Refresh the record when a data-mutating modal above this one closes.
	// Closing a view modal is just navigation — no re-fetch needed.
	useEffect(() => {
		const prevStack = prevModalStackRef.current;
		prevModalStackRef.current = modalStack;

		if (modalStack.length < prevStack.length) {
			const closedModal = prevStack[prevStack.length - 1];
			if (closedModal && closedModal.mode !== 'view') {
				refreshRecord();
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [modalStack]);

	// Reset when closed
	useEffect(() => {
		if (!isOpen) {
			setRecordData(null);
			setRecordTitle(undefined);
			setRelations([]);
			setRelationSchemas({});
		}
	}, [isOpen]);

	return { recordData, recordTitle, relations, relationSchemas, loading, error, refreshRecord };
}
