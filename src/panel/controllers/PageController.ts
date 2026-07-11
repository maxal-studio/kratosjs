import type { KratosRequest, KratosReply } from '../../http/types';
import type { Panel } from '../../Panel';
import { t } from '../../i18n/serverT';

/**
 * Page endpoint: returns the serialized page definition with executed widget data.
 */
export class PageController {
	constructor(private panel: Panel) {}

	/**
	 * Handle page data request
	 */
	async handlePageData(req: KratosRequest, reply: KratosReply): Promise<void> {
		try {
			const pageSlug = req.params.page as string;
			const PageClass = this.panel.getPages().get(pageSlug);

			if (!PageClass) {
				reply.status(404).json({
					message: t('core:page.not_found', { slug: pageSlug }),
				});
				return;
			}

			// Check page access if hook is registered
			if (this.panel.hooks.pageAccessCheck) {
				const hasAccess = await this.panel.hooks.pageAccessCheck(pageSlug, req.authUser);
				if (!hasAccess) {
					reply.status(403).json({
						message: t('core:page.access_denied'),
					});
					return;
				}
			}

			// Serialize page (blocks() can use Page.getContext() inside)
			let pageData = await PageClass.toJSON();

			// Filter page blocks if hook is registered
			if (this.panel.hooks.pageBlocksFilter && pageData.blocks) {
				pageData = {
					...pageData,
					blocks: await this.panel.hooks.pageBlocksFilter(pageData.blocks, pageSlug, req.authUser),
				};
			}

			// Collect widget execution promises
			const widgetPromises: Array<Promise<{ name: string; data: any }>> = [];

			const collectWidgets = (blocks: any[]): void => {
				for (const block of blocks) {
					if (block.type === 'widget' && block.widget) {
						// Find the widget in registered resources (built per request).
						let widgetFound = false;
						for (const [, registered] of this.panel.getResources()) {
							{
								const widget = this.panel.buildResourceWidgets(registered).get(block.widget.name);
								if (widget) {
									widgetFound = true;
									// Add widget execution promise
									widgetPromises.push(
										widget
											.execute(this.panel.getEm(), registered.resourceClass.entity)
											.then(data => ({ name: block.widget.name, data }))
											.catch((error: any) => {
												console.error(
													`Error rendering widget data for ${block.widget.name}:`,
													error,
												);
												return { name: block.widget.name, data: null };
											}),
									);
									break;
								}
							}
						}
						if (!widgetFound) {
							console.warn(`Widget "${block.widget.name}" not found in any resource`);
							widgetPromises.push(Promise.resolve({ name: block.widget.name, data: null }));
						}
					} else if (block.type === 'tabs' && block.tabs) {
						// Recursively collect widgets from tabs
						for (const tab of block.tabs) {
							if (tab.blocks) {
								collectWidgets(tab.blocks);
							}
						}
					}
				}
			};

			// Collect all widgets from blocks
			collectWidgets(pageData.blocks);

			// Execute all widgets in parallel
			const widgetResults = await Promise.all(widgetPromises);

			// Build widget data object
			const widgetData: Record<string, any> = {};
			for (const result of widgetResults) {
				widgetData[result.name] = result.data;
			}

			// Return page data with widget data
			reply.json({
				page: pageData,
				widgetData: Object.keys(widgetData).length > 0 ? widgetData : undefined,
			});
		} catch (error: any) {
			console.error('Error fetching page data:', error);
			reply.status(500).json({
				message: error.message || 'Failed to fetch page data',
			});
		}
	}
}
