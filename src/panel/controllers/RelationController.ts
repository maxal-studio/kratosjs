import { Request, Response } from 'express';
import type { Panel } from '../../Panel';
import { SerializedRelation } from '../../resource/types';
import { applyColumnFormatters, applyFieldFormatters } from '../../utils/dataFormatters';
import { getFilteredCapabilitiesBySlug } from '../access';
import { getPanelResource } from './utils';
import { t } from '../../i18n/serverT';

/**
 * Relation endpoints: relation metadata, related-record listing and creation.
 */
export class RelationController {
	constructor(private panel: Panel) {}

	/**
	 * Get relations metadata for a resource
	 */
	async handleRelations(req: Request, res: Response): Promise<void> {
		const registered = getPanelResource(req);

		try {
			let relations = registered.resourceClass.getRelations();

			// Filter relations based on user permissions
			if (this.panel.hooks.capabilitiesFilter) {
				const authUser = req.authUser;
				const filteredRelations = await Promise.all(
					relations.map(async relation => {
						// Get filtered capabilities for the related resource
						const capabilities = await getFilteredCapabilitiesBySlug(
							this.panel,
							relation.resourceSlug,
							authUser,
						);
						// Check if user has view access to the related resource
						return capabilities && capabilities.canView ? relation : null;
					}),
				);
				relations = filteredRelations.filter((r): r is SerializedRelation => r !== null);
			}

			// Build full absolute URL from request
			const protocol = req.protocol;
			const host = req.get('host');
			const baseUrl = `${protocol}://${host}${this.panel.getBasePath()}`;

			// Enhance relations with full API URLs
			const enhancedRelations = relations.map(relation => ({
				...relation,
				resourceApiUrl: `${baseUrl}/${relation.resourceSlug}`,
			}));

			res.json({ relations: enhancedRelations });
		} catch (error: any) {
			console.error('Error fetching relations:', error);
			res.status(500).json({
				message: error.message || 'Failed to fetch relations',
			});
		}
	}

	/**
	 * Get relation data for a specific record
	 */
	async handleRelationData(req: Request, res: Response): Promise<void> {
		const registered = getPanelResource(req);
		const { id, relationName } = req.params;
		const { page = 1, perPage = 10, search, sort, sortDirection, filters = {}, queryBuilders = {} } = req.body;

		try {
			// Find relation config
			const relations = registered.resourceClass.getRelations();
			const relation = relations.find(r => r.name === relationName);

			if (!relation) {
				res.status(404).json({ message: t('core:relation.not_found') });
				return;
			}

			// Get related resource
			const relatedResource = this.panel.getResource(relation.resourceSlug);
			if (!relatedResource) {
				res.status(404).json({ message: t('core:relation.related_not_found') });
				return;
			}
			const relatedResourceInstance = this.panel.createResourceInstance(relatedResource);
			const tableSchema = relatedResourceInstance.getTableSchema();

			const result = await relatedResourceInstance.listRelated({
				parentId: id,
				relation,
				page,
				perPage,
				search,
				sort,
				sortDirection,
				filters,
				queryBuilders,
				populate: tableSchema.populate,
				grouping: tableSchema.grouping,
			});

			// Apply column formatters and media transform (table schema filtering done in Resource.listRelated)
			if (tableSchema && result.data.length > 0) {
				// Apply column formatters if any columns have formatters
				const tableBuilder = relatedResource.resourceClass.table();
				result.data = await applyColumnFormatters(result.data, tableBuilder);

				// Transform media fields to URLs for the frontend
				result.data = await Promise.all(
					result.data.map((row: any) => this.panel.media.transformFieldsToUrls(row, tableSchema, 'table')),
				);
			}

			res.json(result);
		} catch (error: any) {
			console.error('Error loading relation data:', error);
			res.status(500).json({
				message: error.message || 'Failed to load relation data',
			});
		}
	}

	/**
	 * Create a new relation (related record for hasMany)
	 */
	async handleCreateRelation(req: Request, res: Response): Promise<void> {
		const registered = getPanelResource(req);
		const { id, relationName } = req.params;
		const relationData = req.body;

		try {
			// Find relation config
			const relations = registered.resourceClass.getRelations();
			const relation = relations.find(r => r.name === relationName);

			if (!relation) {
				res.status(404).json({ message: t('core:relation.not_found') });
				return;
			}

			// Get related resource
			const relatedResource = this.panel.getResource(relation.resourceSlug);
			if (!relatedResource) {
				res.status(404).json({ message: t('core:relation.related_not_found') });
				return;
			}

			// Apply field formatters if any fields have formatters
			const formBuilder = relatedResource.resourceClass.form();
			const formattedRelationData = relationData;
			// const formattedRelationData = await applyFieldFormatters(relationData, formBuilder);

			// Transform media fields to DB format
			await this.panel.transformMediaFieldsForStorage(
				formattedRelationData,
				relatedResource.resourceClass.form().toJSON(),
			);

			// Add foreign key to the data
			const dataWithForeignKey = {
				...formattedRelationData,
				[relation.foreignKey]: id,
			};

			// Create resource instance
			const resourceInstance = this.panel.createResourceInstance(relatedResource);
			// Create record
			const created = await resourceInstance.create(dataWithForeignKey);

			// Apply field formatters to result if any fields have formatters
			const formattedCreated = await applyFieldFormatters(created, formBuilder);

			// Compute record title
			const recordTitle = relatedResource.resourceClass.computeRecordTitle?.(formattedCreated);

			// Wrap response in data/metadata structure
			res.setHeader('X-KratosJs-Refresh-Badges', 'true');
			res.status(201).json({
				data: formattedCreated,
				metadata: {
					...(recordTitle ? { recordTitle } : {}),
					refreshBadges: true,
				},
			});
		} catch (error: any) {
			console.error('Error creating relation:', error);
			res.status(500).json({
				message: error.message || 'Failed to create relation',
			});
		}
	}

	/**
	 * Update a relation (not supported for hasMany - update the related record directly)
	 */
	async handleUpdateRelation(_req: Request, res: Response): Promise<void> {
		res.status(400).json({
			message: t('core:relation.update_unsupported'),
		});
	}
}
