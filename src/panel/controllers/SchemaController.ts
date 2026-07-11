import type { KratosRequest, KratosReply } from '../../http/types';
import type { Panel } from '../../Panel';
import { getFilteredCapabilities } from '../access';
import { enrichFormSchemaRelationships } from '../enrichFormSchema';
import { getPanelResource } from './utils';

/**
 * Serves the form and table schemas of a resource (GET /:resource/schema/*).
 */
export class SchemaController {
	constructor(private panel: Panel) {}

	/**
	 * Get form schema for a resource
	 */
	async handleFormSchema(req: KratosRequest, reply: KratosReply): Promise<void> {
		const resource = getPanelResource(req);
		const resourceInstance = this.panel.createResourceInstance(resource);
		let schema = resourceInstance.getFormSchema();
		const actionHandlers = resource.resourceClass.actions();

		// Get table schema to extract actions
		const tableSchema = resourceInstance.getTableSchema();

		// Enrich actions with hasHandler flag based on defined action handlers
		if (tableSchema.actions) {
			tableSchema.actions = tableSchema.actions.map(action => ({
				...action,
				hasHandler: !!actionHandlers[action.name],
			}));

			// Add actions to form schema
			schema.actions = tableSchema.actions;
		}

		// Apply table schema filter hook if registered (to filter actions consistently)
		if (this.panel.hooks.tableSchemaFilter) {
			const filteredTableSchema = await this.panel.hooks.tableSchemaFilter(
				tableSchema,
				resource.resourceClass.getSlug(),
				req.authUser,
			);
			// Update form schema actions with filtered actions
			schema.actions = filteredTableSchema.actions;
		}

		// Apply form schema filter hook if registered
		if (this.panel.hooks.formSchemaFilter) {
			schema = await this.panel.hooks.formSchemaFilter(schema, resource.resourceClass.getSlug(), req.authUser);
		}

		// Resolve relationship resource slugs from entity metadata (e.g. post -> posts)
		schema = enrichFormSchemaRelationships(this.panel, resource.resourceClass, schema);

		// Get filtered capabilities (includes plugin permissions)
		const capabilities = await getFilteredCapabilities(this.panel, resource, req.authUser);

		reply.json({
			resource: resource.resourceClass.getSlug(),
			schema,
			...capabilities,
		});
	}

	/**
	 * Get table schema for a resource
	 */
	async handleTableSchema(req: KratosRequest, reply: KratosReply): Promise<void> {
		const resource = getPanelResource(req);
		const resourceInstance = this.panel.createResourceInstance(resource);

		let schema = resourceInstance.getTableSchema();
		const actionHandlers = resource.resourceClass.actions();

		// Enrich actions with hasHandler flag based on defined action handlers
		if (schema.actions) {
			schema.actions = schema.actions.map(action => ({
				...action,
				hasHandler: !!actionHandlers[action.name],
			}));
		}

		// Enrich bulk actions with hasHandler flag
		if (schema.bulkActions) {
			schema.bulkActions = schema.bulkActions.map(action => ({
				...action,
				hasHandler: !!actionHandlers[action.name],
			}));
		}

		// Enrich header actions with hasHandler flag
		if (schema.headerActions) {
			schema.headerActions = schema.headerActions.map(action => ({
				...action,
				hasHandler: !!actionHandlers[action.name],
			}));
		}

		// Add widget metadata to schema (built per request so t() labels localize).
		const resourceWidgets = this.panel.buildResourceWidgets(resource);
		if (resourceWidgets.size > 0) {
			schema.widgets = Array.from(resourceWidgets.values()).map(widget => widget.toJSON());
		}

		// Apply table schema filter hook if registered
		if (this.panel.hooks.tableSchemaFilter) {
			schema = await this.panel.hooks.tableSchemaFilter(schema, resource.resourceClass.getSlug(), req.authUser);
		}

		// Get filtered capabilities (includes plugin permissions)
		const capabilities = await getFilteredCapabilities(this.panel, resource, req.authUser);

		reply.json({
			resource: resource.resourceClass.getSlug(),
			schema,
			...capabilities,
		});
	}
}
