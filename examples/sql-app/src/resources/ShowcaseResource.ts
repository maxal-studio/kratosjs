import {
	BaseResource,
	FormBuilder,
	// Form fields
	TextInput,
	SelectInput,
	Checkbox,
	Toggle,
	Textarea,
	Radio,
	DateTimePicker,
	ColorPicker,
	Repeater,
	TagsInput,
	HiddenInput,
	FileUpload,
	RichEditor,
	Section,
	Group,
	Tabs,
	// Table
	TableBuilder,
	TextColumn,
	IconColumn,
	ImageColumn,
	ColorColumn,
	TagsColumn,
	CheckboxColumn,
	ToggleColumn,
	SelectColumn,
	TextInputColumn,
	// Filters
	SelectFilter,
	TernaryFilter,
	DateFilter,
	QueryBuilderFilter,
	textConstraint,
	numberConstraint,
	booleanConstraint,
	selectConstraint,
	dateConstraint,
	// Tabs (table quick filters)
	equalsRule,
	greaterThanOrEqualRule,
	// Actions
	Action,
	BulkAction,
	// Widgets
	StatsWidget,
	ChartWidget,
	Widget,
	type ActionHandler,
	type FormContext,
} from '@maxal_studio/kratosjs';
import { Showcase } from '../entities/Showcase';
import { UserResource } from './UserResource';
import { formatUserOption } from '../utils/formatSelectOption';
// App-level custom components (no plugin) — the React renderers are registered
// in src/admin/main.tsx via mountAdminPanel({ fields, columns }).
import { StarRating } from '../fields/StarRating';
import { StarRatingColumn } from '../columns/StarRatingColumn';

const STATUS_OPTIONS = {
	draft: 'Draft',
	review: 'In Review',
	published: 'Published',
	archived: 'Archived',
};

const CATEGORY_OPTIONS = {
	electronics: 'Electronics',
	clothing: 'Clothing',
	books: 'Books',
	toys: 'Toys',
	other: 'Other',
};

/**
 * Kitchen-sink resource: exercises every form field, table column, filter,
 * quick-filter tab, and action variant the framework offers, so the whole
 * surface can be smoke-tested against real data in one place.
 */
export class ShowcaseResource extends BaseResource {
	static slug = 'showcase';

	static entity = Showcase;

	static label = 'Showcase';
	static pluralLabel = 'Showcase Items';
	static icon = 'FlaskConical';
	static navigationGroup = 'App';
	static navigationSort = 2;

	static recordTitleAttribute = 'title';
	static recordFeaturedImageAttribute = 'featuredImage';
	static globallySearchableAttributes = ['title', 'slug', 'description'];

	static form() {
		return FormBuilder.make().schema([
			Tabs.make('main').tabs([
				{
					label: 'General',
					icon: 'Info',
					schema: [
						TextInput.make('title')
							.label('Title')
							.required()
							.min(3)
							.max(120)
							.placeholder('A short, descriptive title...')
							.helperText('Shown everywhere this item appears.')
							.autofocus(),
						TextInput.make('slug')
							.label('Slug')
							.alphaDash()
							.placeholder('my-showcase-item')
							.hint('Lowercase letters, numbers and dashes only')
							.hintIcon('Link'),
						Group.make('statusGroup')
							.columns(2)
							.label('Status')
							.description('Status of the showcase item.')
							.schema([
								SelectInput.make('status')
									.label('Status')
									.options(STATUS_OPTIONS)
									.default('draft')
									.required(),
								SelectInput.make('category')
									.label('Category')
									.options(CATEGORY_OPTIONS)
									.searchable()
									.placeholder('Pick a category...'),
							]),
						Group.make('numbersGroup')
							.columns(3)
							.label('Numbers')
							.description('Numbers for the showcase item.')
							.schema([
								TextInput.make('priority')
									.label('Priority (1-5)')
									.numeric()
									.minValue(1)
									.maxValue(5)
									.step(1)
									.default(3),
								TextInput.make('price')
									.label('Price (USD)')
									.numeric()
									.minValue(0)
									.step(0.01)
									.required(),
								TextInput.make('quantity')
									.label('Quantity')
									.numeric()
									.integer()
									.minValue(0)
									.default(0)
									.required(),
							]),
						StarRating.make('stars').label('Rating').maxStars(5),
						Radio.make('visibility')
							.label('Visibility')
							.options({ public: 'Public', private: 'Private', unlisted: 'Unlisted' })
							.inline()
							.default('public'),
						Toggle.make('isFeatured').label('Featured').onIcon('Star').offIcon('StarOff').default(false),
						Checkbox.make('acceptTerms').label('Terms accepted').helperText('Plain checkbox field.'),
					],
				},
				{
					label: 'Content',
					icon: 'FileText',
					schema: [
						Textarea.make('description')
							.label('Description')
							.required()
							.rows(4)
							.maxLength(500)
							.placeholder('Plain-text summary...')
							.helperText('Max 500 characters.'),
						RichEditor.make('content')
							.label('Content')
							.placeholder('Write rich content here...')
							.htmlSource()
							.embeds(),
						TagsInput.make('tags')
							.label('Tags')
							.suggestions(['new', 'sale', 'limited', 'eco', 'premium'])
							.maxItems(8)
							.reorderable()
							.showInPopup(),
					],
				},
				{
					label: 'Media & Dates',
					icon: 'Image',
					schema: [
						FileUpload.make('featuredImage')
							.label('Featured Image')
							.image()
							.maxSize(5 * 1024 * 1024),
						FileUpload.make('gallery')
							.label('Gallery')
							.image()
							.multiple()
							.maxFiles(4)
							.helperText('Up to 4 images.'),
						Group.make('visualsGroup')
							.columns(2)
							.label('Visuals')
							.description('Visuals for the showcase item.')
							.schema([
								ColorPicker.make('color').label('Brand Color').hex(),
								SelectInput.make('assignee')
									.label('Assignee')
									.relationship('assignee', 'firstname', UserResource)
									.formatOptionLabelUsing(formatUserOption)
									.searchable()
									.placeholder('Assign a user...'),
							]),
						Group.make('datesGroup')
							.columns(2)
							.label('Dates')
							.description('Dates for the showcase item.')
							.schema([
								DateTimePicker.make('launchAt').label('Launch Date').native(),
								DateTimePicker.make('publishedAt')
									.label('Published At')
									.native()
									// Conditional visibility: only relevant once published
									.hidden((context: FormContext) => context?.get?.('status') !== 'published'),
							]),
					],
				},
				{
					label: 'Advanced',
					icon: 'Settings2',
					schema: [
						Section.make('specsSection')
							.heading('Specifications')
							.icon('ListChecks')
							.description('Repeater field with nested schema.')
							.collapsible()
							.collapsed(false)
							.visible(true)
							.schema([
								Repeater.make('specs')
									.label('Specs')
									.required()
									.schema([
										TextInput.make('key').label('Name').required(),
										TextInput.make('value').label('Value').required(),
										Toggle.make('highlighted').label('Highlight').default(false),
									])
									.minItems(1)
									.maxItems(5)
									.reorderable()
									.collapsible()
									.itemLabel('Spec'),
							]),
						Section.make('contactSection')
							.heading('Links & Contact')
							.icon('Phone')
							.compact()
							.columns(2)
							.schema([
								TextInput.make('website').label('Website').url().placeholder('https://...'),
								TextInput.make('phone').label('Phone').tel().placeholder('+1 555 0100'),
							]),
						Textarea.make('internalNotes')
							.label('Internal Notes')
							.rows(3)
							.helperText('Hidden in view mode — edit/create only.')
							.hidden((context: FormContext) => context?.operation === 'view'),
						HiddenInput.make('source').default('admin-panel'),
					],
				},
			]),
		]);
	}

	static table() {
		return TableBuilder.make()
			.columns([
				ImageColumn.make('featuredImage').label('Image').circular().toggleable(),
				TextColumn.make('title').label('Title').sortable().searchable().weight('semibold').limit(40),
				TextColumn.make('status')
					.label('Status')
					.badge()
					.colors({
						draft: 'text-warning',
						review: 'text-info',
						published: 'text-success',
						archived: 'text-gray',
					})
					.sortable(),
				IconColumn.make('visibility')
					.label('Visibility')
					.icon({ public: 'Globe', private: 'Lock', unlisted: 'EyeOff' })
					.iconColor({ public: 'text-green-600', private: 'text-red-600', unlisted: 'text-yellow-600' })
					.toggleable(),
				SelectColumn.make('category').label('Category').options(CATEGORY_OPTIONS).selectablePlaceholder(),
				TextColumn.make('price').label('Price').money('USD').sortable(),
				TextInputColumn.make('quantity').label('Qty').type('number').rules(['numeric']).sortable(),
				// Custom app-level column (no plugin) — renders the rating as stars.
				StarRatingColumn.make('stars').label('Rating').sortable(),
				ColorColumn.make('color').label('Color').toggleable(),
				TagsColumn.make('tags').label('Tags').limit(3).toggleable(),
				ToggleColumn.make('isFeatured')
					.label('Featured')
					.onIcon('Check')
					.offIcon('X')
					.offColor('bg-green-600 dark:bg-green-500')
					.onColor('bg-red-400 dark:bg-red-600'),
				CheckboxColumn.make('acceptTerms').label('Terms').toggleable(true, true),
				TextColumn.make('assigneeName')
					.label('Assignee')
					.formatStateUsing((_value: any, row: any) => {
						if (!row.assignee) return '-';
						return row.assignee.lastname
							? `${row.assignee.firstname} ${row.assignee.lastname}`
							: row.assignee.firstname;
					})
					.deeplink({
						resource: 'users',
						id: (_value: any, row: any) => row.assignee?.id ?? row.assignee?._id,
					}),
				TextColumn.make('launchAt').label('Launch').date().sortable().toggleable(),
				TextColumn.make('createdAt').label('Created').since().sortable().toggleable(true, true),
			])
			.filters([
				SelectFilter.make('status').label('Status').options(STATUS_OPTIONS).placeholder('All statuses'),
				TernaryFilter.make('isFeatured').label('Featured').trueLabel('Featured').falseLabel('Not featured'),
				DateFilter.make('launchAt').label('Launch date'),
				QueryBuilderFilter.make('advanced')
					.label('Advanced Search')
					.constraints([
						textConstraint('title', 'Title'),
						numberConstraint('priority', 'Priority'),
						numberConstraint('price', 'Price'),
						selectConstraint('status', 'Status', STATUS_OPTIONS),
						booleanConstraint('isFeatured', 'Featured'),
						dateConstraint('launchAt', 'Launch date'),
					]),
			])
			.tabs([
				{
					key: 'published',
					label: 'Published',
					icon: 'CheckCircle2',
					queryBuilder: [equalsRule('status', 'published', 'select')],
				},
				{
					key: 'drafts',
					label: 'Drafts',
					icon: 'Pencil',
					queryBuilder: [equalsRule('status', 'draft', 'select')],
				},
				{
					key: 'featured',
					label: 'Featured',
					icon: 'Star',
					queryBuilder: [equalsRule('isFeatured', true, 'boolean')],
				},
				{
					key: 'high-priority',
					label: 'High Priority',
					icon: 'Flame',
					queryBuilder: [greaterThanOrEqualRule('priority', 4, 'number')],
				},
			])
			.actions([
				// Action WITHOUT a form, with confirmation
				Action.make('duplicate')
					.label('Duplicate')
					.icon('Copy')
					.requiresConfirmation()
					.modalDescription('Create a copy of this item as a draft?'),
				// Action WITHOUT a form, no confirmation (instant)
				Action.make('toggleFeatured').label('Toggle Featured').icon('Star'),
				// Action WITH a form
				Action.make('schedule')
					.label('Schedule')
					.icon('CalendarClock')
					.form(
						FormBuilder.make().schema([
							DateTimePicker.make('launchAt').label('New launch date').native().required(),
							Textarea.make('reason').label('Reason').rows(2).placeholder('Why reschedule?'),
						]),
					),
			])
			.bulkActions([
				// Bulk action WITHOUT a form, with confirmation
				BulkAction.make('bulkPublish')
					.label('Publish Selected')
					.icon('CheckCircle2')
					.requiresConfirmation()
					.modalDescription('Publish all selected items?'),
				// Bulk action WITH a form
				BulkAction.make('bulkTag')
					.label('Add Tag')
					.icon('Tag')
					.form(
						FormBuilder.make().schema([
							TextInput.make('tag').label('Tag to add').required().min(2).max(30),
						]),
					),
			])
			.populate([{ path: 'assignee' }])
			.searchable()
			.striped()
			.paginate(10)
			.allowLayoutSwitch()
			.defaultLayout('table')
			.filtersLayout('dropdown')
			.defaultSort('createdAt', 'desc');
	}

	static actions(): Record<string, ActionHandler> {
		return {
			duplicate: async ({ records }) => {
				const em = this.getPanel().getEm().fork();
				const source = records?.[0];
				if (!source) return { success: false, message: 'No record selected' };

				const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = source;
				em.create(this.entity, {
					...rest,
					title: `${source.title} (copy)`,
					slug: source.slug ? `${source.slug}-copy` : undefined,
					status: 'draft',
					publishedAt: null,
				});
				await em.flush();
				return { success: true, message: `Duplicated "${source.title}" as a draft` };
			},

			toggleFeatured: async ({ records }) => {
				const em = this.getPanel().getEm().fork();
				const record = records?.[0];
				if (!record) return { success: false, message: 'No record selected' };

				await em.nativeUpdate(this.entity, { id: record.id }, { isFeatured: !record.isFeatured });
				return {
					success: true,
					message: record.isFeatured ? 'Removed from featured' : 'Marked as featured',
				};
			},

			schedule: async ({ records, formData }) => {
				const em = this.getPanel().getEm().fork();
				const record = records?.[0];
				if (!record) return { success: false, message: 'No record selected' };
				if (!formData?.launchAt) return { success: false, message: 'A launch date is required' };

				await em.nativeUpdate(this.entity, { id: record.id }, { launchAt: new Date(formData.launchAt) });
				return { success: true, message: `"${record.title}" scheduled for ${formData.launchAt}` };
			},

			bulkPublish: async ({ records }) => {
				const em = this.getPanel().getEm().fork();
				const ids = (records || []).map(r => r.id);
				if (ids.length === 0) return { success: false, message: 'No records selected' };

				await em.nativeUpdate(
					this.entity,
					{ id: { $in: ids } },
					{ status: 'published', publishedAt: new Date() },
				);
				return { success: true, message: `Published ${ids.length} item(s)` };
			},

			bulkTag: async ({ records, formData }) => {
				const em = this.getPanel().getEm().fork();
				const tag = formData?.tag?.trim();
				if (!tag) return { success: false, message: 'A tag is required' };

				for (const record of records || []) {
					const tags: string[] = Array.isArray(record.tags) ? record.tags : [];
					if (!tags.includes(tag)) {
						await em.nativeUpdate(this.entity, { id: record.id }, { tags: [...tags, tag] });
					}
				}
				return { success: true, message: `Tagged ${records?.length ?? 0} item(s) with "${tag}"` };
			},
		};
	}

	static widgets(): Widget[] {
		return [
			StatsWidget.make('totalItems')
				.label('Total Items')
				.icon('FlaskConical')
				.render(async (em, entity) => em.count(entity, {})),
			StatsWidget.make('publishedItems')
				.label('Published')
				.icon('CheckCircle2')
				.render(async (em, entity) => em.count(entity, { status: 'published' } as any)),
			StatsWidget.make('totalValue')
				.label('Inventory Value')
				.icon('DollarSign')
				.format('currency')
				.currency('USD')
				.render(async (em, entity) => {
					const items: any[] = await em.find(entity, {});
					return items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);
				}),
			ChartWidget.make('itemsByStatus')
				.label('Items by Status')
				.type('pie')
				.showLegend()
				.render(async (em, entity) => {
					const items: any[] = await em.find(entity, {});
					const counts: Record<string, number> = {};
					for (const item of items) {
						counts[item.status] = (counts[item.status] || 0) + 1;
					}
					return Object.entries(counts).map(([label, value]) => ({ label, value }));
				}),
		];
	}
}
