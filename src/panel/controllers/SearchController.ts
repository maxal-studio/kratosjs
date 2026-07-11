import type { KratosRequest, KratosReply } from '../../http/types';
import type { Panel } from '../../Panel';
import { t } from '../../i18n/serverT';

/**
 * Global search endpoint: searches every resource that defines
 * globallySearchableAttributes and groups the results per resource.
 */
export class SearchController {
	constructor(private panel: Panel) {}

	/**
	 * Handle global search across all resources
	 */
	async handleGlobalSearch(req: KratosRequest, reply: KratosReply): Promise<void> {
		try {
			const { query } = req.body;

			if (!query || typeof query !== 'string' || query.trim().length === 0) {
				reply.json({});
				return;
			}

			const searchQuery = query.trim();
			const results: Record<string, any> = {};

			// Iterate through all registered resources
			for (const [slug, registered] of this.panel.getResources()) {
				const ResourceClass = registered.resourceClass;
				const resourceInstance = this.panel.createResourceInstance(registered);

				// Filter resources that have globallySearchableAttributes defined
				const globallySearchableFields = ResourceClass.getGloballySearchableAttributes();
				if (!globallySearchableFields || globallySearchableFields.length === 0) {
					continue;
				}

				// Get table schema to filter fields
				const tableSchema = resourceInstance.getTableSchema();
				const tableColumnNames = tableSchema.columns ? tableSchema.columns.map((col: any) => col.name) : [];

				// Filter searchable fields to only include those in table schema
				const searchableFields = globallySearchableFields.filter(field => tableColumnNames.includes(field));

				// Skip if no valid searchable fields after filtering
				if (searchableFields.length === 0) {
					continue;
				}

				try {
					// Call adapter's globalSearch with query, searchable fields, and limit (5)
					const records = await registered.adapter.globalSearch(searchQuery, searchableFields, 5);

					if (records.length === 0) {
						continue;
					}

					// Get form schema for media transformation
					const formSchema = resourceInstance.getFormSchema();

					// Transform records: media fields, compute titles, extract featured images
					const transformedResults = await Promise.all(
						records.map(async (record: any) => {
							// Transform media fields (featured image)
							const transformedRecord = await this.panel.media.transformFieldsToUrls(
								record,
								formSchema,
								'form',
							);

							// Compute record titles using computeRecordTitle
							const title = ResourceClass.computeRecordTitle?.(transformedRecord);

							// Extract featured images using getRecordFeaturedImage
							const featuredImage = ResourceClass.getRecordFeaturedImage?.(transformedRecord);

							return {
								_id: record._id,
								title: title || record._id,
								featuredImage: featuredImage,
								record: transformedRecord,
							};
						}),
					);

					// Group results by resource slug
					results[slug] = {
						label: ResourceClass.getLabel(),
						pluralLabel: ResourceClass.getPluralLabel(),
						icon: ResourceClass.getIcon(),
						results: transformedResults,
					};
				} catch (error: any) {
					// Log error but continue with other resources
					console.error(`Error searching resource ${slug}:`, error);
				}
			}

			reply.json(results);
		} catch (error: any) {
			console.error('Error in global search:', error);
			reply.status(500).json({
				message: error.message || t('core:search.failed'),
			});
		}
	}
}
