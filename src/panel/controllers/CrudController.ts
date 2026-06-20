import { Request, Response } from 'express';
import type { Panel } from '../../Panel';
import { ActionRequest } from '../types';
import { applyColumnFormatters, applyFieldFormatters } from '../../utils/dataFormatters';
import {
	getFileUploadFields,
	detectDeletedMediaFiles,
	collectMediaFilesFromRecords,
	handleError,
} from '../../utils/panelHelpers';
import { checkOperationAccess } from '../access';
import { getPanelResource } from './utils';

/**
 * CRUD + custom action endpoints for resources:
 * create, findById, list, update, bulk-delete, and POST /:resource/actions.
 */
export class CrudController {
	constructor(private panel: Panel) {}

	/**
	 * Create a new record
	 */
	async handleCreate(req: Request, res: Response): Promise<void> {
		const registered = getPanelResource(req);

		try {
			// Create resource instance
			const resourceInstance = this.panel.createResourceInstance(registered);
			// Check operation access (combines resource flags and plugin permissions)
			const accessCheck = await checkOperationAccess(this.panel, registered, 'create', req.authUser);
			if (!accessCheck.allowed) {
				res.status(403).json({
					message: accessCheck.message,
				});
				return;
			}

			const data = { ...req.body };

			// Apply field formatters if any fields have formatters
			const formBuilder = registered.resourceClass.form();
			const formattedData = data;
			// const formattedData = await applyFieldFormatters(data, formBuilder);

			// Transform media fields to DB format
			await this.panel.transformMediaFieldsForStorage(formattedData, resourceInstance.getFormSchema());

			// Save record
			const result = await resourceInstance.create(formattedData);

			// Apply field formatters to result if any fields have formatters
			const formattedResult = await applyFieldFormatters(result, formBuilder);

			// Compute record title and return response
			const recordTitle = registered.resourceClass.computeRecordTitle?.(formattedResult);
			res.setHeader('X-KratosJs-Refresh-Badges', 'true');
			res.status(201).json({
				data: formattedResult,
				metadata: {
					...(recordTitle ? { recordTitle } : {}),
					refreshBadges: true,
				},
			});
		} catch (error: any) {
			handleError(res, error);
		}
	}

	/**
	 * Find a record by ID
	 */
	async handleFindById(req: Request, res: Response): Promise<void> {
		const registered = getPanelResource(req);

		try {
			// Create resource instance
			const resourceInstance = this.panel.createResourceInstance(registered);
			// Check operation access (combines resource flags and plugin permissions)
			const accessCheck = await checkOperationAccess(this.panel, registered, 'read', req.authUser);
			if (!accessCheck.allowed) {
				res.status(403).json({
					message: accessCheck.message,
				});
				return;
			}

			// Get authenticated user
			const authUser = req.authUser;
			let result = await resourceInstance.findById(req.params.id);

			if (!result) {
				res.status(404).json({
					message: 'Record not found',
				});
				return;
			}

			// Apply data filtering hook if registered
			if (this.panel.hooks.dataFilter) {
				const filtered = await this.panel.hooks.dataFilter(
					[result],
					registered.resourceClass.getSlug(),
					'findById',
					authUser,
				);
				if (filtered.length === 0) {
					res.status(403).json({
						message: 'Access denied to view this record',
					});
					return;
				}
				result = filtered[0];
			}

			// Apply field formatters if any fields have formatters
			const formBuilder = registered.resourceClass.form();
			result = await applyFieldFormatters(result, formBuilder);

			// Transform media fields to URLs for the frontend
			const transformedResult = await this.panel.media.transformFieldsToUrls(
				result,
				resourceInstance.getFormSchema(),
				'form',
			);

			// Compute record title
			const recordTitle = registered.resourceClass.computeRecordTitle?.(transformedResult);

			// Wrap response in data/metadata structure
			res.json({
				data: transformedResult,
				metadata: {
					...(recordTitle ? { recordTitle } : {}),
				},
			});
		} catch (error: any) {
			res.status(500).json({
				message: error.message || 'Internal server error',
			});
		}
	}

	/**
	 * List records with filtering, sorting, and pagination
	 */
	async handleList(req: Request, res: Response): Promise<void> {
		const registered = getPanelResource(req);

		try {
			const resourceInstance = this.panel.createResourceInstance(registered);
			// Check operation access (combines resource flags and plugin permissions)
			const accessCheck = await checkOperationAccess(this.panel, registered, 'read', req.authUser);
			if (!accessCheck.allowed) {
				res.status(403).json({
					message: accessCheck.message,
				});
				return;
			}

			const tableSchema = resourceInstance.getTableSchema();

			// Create table schema with widgets for filtering (same as in handleTableSchema)
			const tableSchemaWithWidgets = { ...resourceInstance.getTableSchema() };
			if (registered.widgets && registered.widgets.size > 0) {
				tableSchemaWithWidgets.widgets = Array.from(registered.widgets.values()).map(widget => widget.toJSON());
			}

			// Get filtered table schema (with widgets filtered by permissions)
			let filteredTableSchema = { ...tableSchemaWithWidgets };
			if (this.panel.hooks.tableSchemaFilter) {
				filteredTableSchema = await this.panel.hooks.tableSchemaFilter(
					filteredTableSchema,
					registered.resourceClass.getSlug(),
					req.authUser,
				);
			}

			const params = this.buildListParams(req, tableSchema);

			// Get authenticated user
			const authUser = req.authUser;
			let result = await resourceInstance.list(params);

			// Apply data filtering hook if registered
			if (this.panel.hooks.dataFilter && result.data && result.data.length > 0) {
				const filteredData = await this.panel.hooks.dataFilter(
					result.data,
					registered.resourceClass.getSlug(),
					'list',
					authUser,
				);
				// Update result with filtered data and adjust pagination
				result = {
					...result,
					data: filteredData,
					pagination: {
						...result.pagination,
						total: filteredData.length < result.data.length ? filteredData.length : result.pagination.total,
					},
				};
			}

			// Apply column formatters if any columns have formatters
			if (result.data && result.data.length > 0) {
				const tableBuilder = registered.resourceClass.table();
				result.data = await applyColumnFormatters(result.data, tableBuilder);
			}

			// Transform media fields to URLs for the frontend
			if (result.data && result.data.length > 0) {
				result.data = await Promise.all(
					result.data.map((row: any) => this.panel.media.transformFieldsToUrls(row, tableSchema, 'table')),
				);
			}

			// Execute widgets if they exist and are allowed by permissions
			let widgetData: Record<string, any> | undefined = undefined;
			if (
				filteredTableSchema.widgets &&
				Array.isArray(filteredTableSchema.widgets) &&
				filteredTableSchema.widgets.length > 0
			) {
				const widgetPromises: Array<Promise<{ name: string; data: any }>> = [];

				for (const widgetSchema of filteredTableSchema.widgets) {
					if (widgetSchema.name && registered.widgets) {
						const widget = registered.widgets.get(widgetSchema.name);
						if (widget) {
							widgetPromises.push(
								widget
									.execute(this.panel.getEm(), registered.resourceClass.entity)
									.then(data => ({ name: widgetSchema.name, data }))
									.catch((error: any) => {
										console.error(`Error executing widget "${widgetSchema.name}":`, error);
										return { name: widgetSchema.name, data: null };
									}),
							);
						}
					}
				}

				// Execute all widgets in parallel
				const widgetResults = await Promise.all(widgetPromises);

				// Build widget data object
				widgetData = {};
				for (const widgetResult of widgetResults) {
					widgetData[widgetResult.name] = widgetResult.data;
				}
			}

			// Return result with widget data
			res.json({
				...result,
				widgets: widgetData && Object.keys(widgetData).length > 0 ? widgetData : undefined,
			});
		} catch (error: any) {
			res.status(500).json({
				message: error.message || 'Internal server error',
			});
		}
	}

	/**
	 * Build list query params from the request body, merging the table schema's
	 * always-applied queryBuilder rules at the end (highest priority).
	 * Shared by list and export.
	 */
	private buildListParams(req: Request, tableSchema: any): Record<string, any> {
		const userQueryBuilders = req.body.queryBuilders || {};
		const finalQueryBuilders = { ...userQueryBuilders };

		if (
			tableSchema.queryBuilder &&
			Array.isArray(tableSchema.queryBuilder) &&
			tableSchema.queryBuilder.length > 0
		) {
			finalQueryBuilders.__alwaysApplied = tableSchema.queryBuilder;
		}

		return {
			page: req.body.page ? parseInt(req.body.page) : undefined,
			perPage: req.body.perPage ? parseInt(req.body.perPage) : undefined,
			search: req.body.search,
			sort: req.body.sort,
			sortDirection: req.body.sortDirection,
			filters: req.body.filters,
			queryBuilders: Object.keys(finalQueryBuilders).length > 0 ? finalQueryBuilders : undefined,
			populate: tableSchema.populate,
			grouping: tableSchema.grouping,
		};
	}

	/**
	 * Export records as a downloadable file in the requested format.
	 *
	 * Reuses the list pipeline (filters, formatters, media URLs, data hook) so the
	 * export matches the on-screen filtered view. When `recordIds` is provided in
	 * the body, only those records are exported (bulk "export selected"). File
	 * serialization is delegated to an exporter registered by a plugin.
	 */
	async handleExport(req: Request, res: Response): Promise<void> {
		const registered = getPanelResource(req);
		const MAX_EXPORT_ROWS = 10000;

		try {
			const accessCheck = await checkOperationAccess(this.panel, registered, 'read', req.authUser);
			if (!accessCheck.allowed) {
				res.status(403).json({ message: accessCheck.message });
				return;
			}

			// Authorize the export action itself (plugins may gate it independently of read access)
			if (this.panel.hooks.actionAccessCheck) {
				const allowed = await this.panel.hooks.actionAccessCheck(
					(req.body.action as string) || 'export',
					registered.resourceClass.getSlug(),
					req.authUser,
				);
				if (!allowed) {
					res.status(403).json({ message: 'You do not have permission to export this resource' });
					return;
				}
			}

			const format = (req.body.format as string) || 'csv';
			const exporter = this.panel.getExporter(format);
			if (!exporter) {
				res.status(400).json({ message: `No exporter registered for format "${format}"` });
				return;
			}

			const resourceInstance = this.panel.createResourceInstance(registered);
			const tableSchema = resourceInstance.getTableSchema();
			const authUser = req.authUser;

			// Fetch rows: selected ids, or all rows matching the current query (capped).
			let rows: any[];
			const recordIds = req.body.recordIds;
			if (Array.isArray(recordIds) && recordIds.length > 0) {
				rows = await registered.adapter.findByIds(recordIds);
			} else {
				const params = {
					...this.buildListParams(req, tableSchema),
					page: 1,
					perPage: MAX_EXPORT_ROWS,
				};
				const result = await resourceInstance.list(params);
				rows = result.data || [];
			}

			// Apply the same post-processing the list endpoint uses.
			if (this.panel.hooks.dataFilter && rows.length > 0) {
				rows = await this.panel.hooks.dataFilter(rows, registered.resourceClass.getSlug(), 'list', authUser);
			}
			if (rows.length > 0) {
				const tableBuilder = registered.resourceClass.table();
				rows = await applyColumnFormatters(rows, tableBuilder);
				rows = await Promise.all(
					rows.map((row: any) => this.panel.media.transformFieldsToUrls(row, tableSchema, 'table')),
				);
			}

			const { content, contentType, filename } = exporter(rows, tableSchema.columns, {
				resourceSlug: registered.resourceClass.getSlug(),
				resourceLabel: registered.resourceClass.label,
			});

			res.setHeader('Content-Type', contentType);
			res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
			res.send(content);
		} catch (error: any) {
			console.error('Error exporting records:', error);
			res.status(500).json({ message: error.message || 'Internal server error' });
		}
	}

	/**
	 * Update a record
	 */
	async handleUpdate(req: Request, res: Response): Promise<void> {
		const registered = getPanelResource(req);

		try {
			const resourceInstance = this.panel.createResourceInstance(registered);
			// Check operation access (combines resource flags and plugin permissions)
			const accessCheck = await checkOperationAccess(this.panel, registered, 'update', req.authUser);
			if (!accessCheck.allowed) {
				res.status(403).json({
					message: accessCheck.message,
				});
				return;
			}

			const data = { ...req.body };

			// Apply field formatters if any fields have formatters
			const formBuilder = registered.resourceClass.form();
			const formattedData = data;
			// const formattedData = await applyFieldFormatters(data, formBuilder);

			const formSchema = resourceInstance.getFormSchema();
			const fileUploadFields = getFileUploadFields(formSchema.components || []);

			const existingRecord = await resourceInstance.findById(req.params.id);

			if (!existingRecord) {
				res.status(404).json({ message: 'Record not found' });
				return;
			}

			// Detect deleted media files and transform media fields
			const filesToDelete = detectDeletedMediaFiles(formattedData, existingRecord, fileUploadFields);
			await this.panel.media.transformFieldsForUpdate(
				formattedData,
				existingRecord,
				formSchema,
				fileUploadFields,
			);

			// Delete removed files from bucket (fires media delete lifecycle hooks)
			await this.panel.deleteMediaFiles(filesToDelete, {
				user: req.authUser,
				resourceSlug: registered.resourceClass.getSlug(),
			});

			// Perform update
			const result = await resourceInstance.update(req.params.id, formattedData);

			// Apply field formatters to result if any fields have formatters
			const formattedResult = await applyFieldFormatters(result, formBuilder);

			// Transform media fields to URLs for the frontend
			const transformedResult = await this.panel.media.transformFieldsToUrls(formattedResult, formSchema, 'form');

			// Compute record title and return response
			const recordTitle = registered.resourceClass.computeRecordTitle?.(transformedResult);
			res.setHeader('X-KratosJs-Refresh-Badges', 'true');
			res.json({
				data: transformedResult,
				metadata: {
					...(recordTitle ? { recordTitle } : {}),
					refreshBadges: true,
				},
			});
		} catch (error: any) {
			handleError(res, error);
		}
	}

	/**
	 * Delete records
	 */
	async handleDelete(req: Request, res: Response): Promise<void> {
		const registered = getPanelResource(req);

		try {
			// Check operation access (combines resource flags and plugin permissions)
			const accessCheck = await checkOperationAccess(this.panel, registered, 'delete', req.authUser);
			if (!accessCheck.allowed) {
				res.status(403).json({
					message: accessCheck.message,
				});
				return;
			}

			const { ids } = req.body;

			if (!ids || !Array.isArray(ids) || ids.length === 0) {
				res.status(400).json({ message: 'ids array is required' });
				return;
			}

			const resourceInstance = this.panel.createResourceInstance(registered);
			const fileUploadFields = getFileUploadFields(resourceInstance.getFormSchema().components || []);

			// Fetch all records before deleting to get their media files
			const recordsToDelete = await Promise.all(
				ids.map(async (id: string) => {
					try {
						return await resourceInstance.findById(id);
					} catch (err) {
						return null;
					}
				}),
			);

			// Collect and delete all media files from records (fires media delete lifecycle hooks)
			const filesToDelete = collectMediaFilesFromRecords(recordsToDelete, fileUploadFields);
			await this.panel.deleteMediaFiles(filesToDelete, {
				user: req.authUser,
				resourceSlug: registered.resourceClass.getSlug(),
			});

			// Delete the records
			const result = await resourceInstance.delete(ids);
			res.setHeader('X-KratosJs-Refresh-Badges', 'true');
			res.json({
				...result,
				metadata: { refreshBadges: true },
			});
		} catch (error: any) {
			handleError(res, error);
		}
	}

	/**
	 * Execute a custom action
	 */
	async handleAction(req: Request, res: Response): Promise<void> {
		const registered = getPanelResource(req);

		try {
			const { action, data } = req.body as ActionRequest;

			if (!action) {
				res.status(400).json({
					message: 'Action name is required',
				});
				return;
			}

			if (!data) {
				res.status(400).json({
					message: 'Action data is required',
				});
				return;
			}

			// Get the action handler
			const handler = registered.actions[action];

			if (!handler) {
				res.status(404).json({
					message: `Action handler "${action}" not found`,
				});
				return;
			}

			// Authorize action execution (plugins gate this; UI hiding is not enough)
			if (this.panel.hooks.actionAccessCheck) {
				const allowed = await this.panel.hooks.actionAccessCheck(
					action,
					registered.resourceClass.getSlug(),
					req.authUser,
				);
				if (!allowed) {
					res.status(403).json({ message: 'You do not have permission to perform this action' });
					return;
				}
			}

			// Populate full records from IDs for security.
			// Header actions operate on no specific records, so an empty list is allowed.
			const recordIds = Array.isArray(data.recordIds) ? data.recordIds : [];
			let records = recordIds.length > 0 ? await registered.adapter.findByIds(recordIds) : [];

			if (recordIds.length > 0 && records.length === 0) {
				res.status(404).json({
					message: 'No valid records found',
				});
				return;
			}

			// Row-level authorization: filter the target records through the data hook.
			// If specific records were requested but none survive, the user cannot act on them.
			if (this.panel.hooks.dataFilter && records.length > 0) {
				records = await this.panel.hooks.dataFilter(
					records,
					registered.resourceClass.getSlug(),
					'update',
					req.authUser,
				);
				if (records.length === 0) {
					res.status(403).json({ message: 'You do not have permission to act on these records' });
					return;
				}
			}

			// Prepare data for handler
			// Always pass { records, formData } - records will be an array with one item for single actions
			const handlerData = {
				records,
				formData: data.formData || {},
			};

			// Execute the action handler through the hook pipeline (beforeAction/afterAction/onError).
			// Handler can still use getRequestContext() if needed.
			const resourceInstance = this.panel.createResourceInstance(registered);
			const result = await resourceInstance.runAction(action, handler, handlerData);

			if (result.success) {
				if (result.refreshBadges) {
					res.setHeader('X-KratosJs-Refresh-Badges', 'true');
				}
				res.status(200).json({
					...(result.redirect ? { redirect: result.redirect } : {}),
					message: result.message || 'Action completed successfully',
					data: result.data,
					...(result.refreshBadges ? { refreshBadges: true } : {}),
				});
			} else {
				res.status(400).json({
					message: result.message || 'Action failed',
				});
			}
		} catch (error: any) {
			console.error('Error executing action:', error);
			res.status(500).json({
				message: error.message || 'Internal server error',
			});
		}
	}
}
