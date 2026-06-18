import {
	BaseResource,
	FormBuilder,
	TextInput,
	Textarea,
	Toggle,
	SelectInput,
	FileUpload,
	TableBuilder,
	TextColumn,
	ImageColumn,
	ToggleColumn,
} from '@maxal_studio/kratosjs';
import type { RelationConfig } from '@maxal_studio/kratosjs';
import { Post } from '../entities/Post';
import { CommentResource } from './CommentResource';
import { UserResource } from './UserResource';

export class PostResource extends BaseResource {
	static slug = 'posts';

	/**
	 * The MikroORM entity
	 */
	static entity = Post;

	static label = 'Post';
	static pluralLabel = 'Posts';
	static icon = 'FileText';
	static navigationGroup = 'App';
	static navigationSort = 3;

	static recordTitleAttribute = 'title';
	static recordFeaturedImageAttribute = 'featuredImage';
	static globallySearchableAttributes = ['title'];

	static form() {
		return FormBuilder.make().schema([
			FileUpload.make('featuredImage').label('Featured Image').image(),
			TextInput.make('title').label('Title').required(),
			Textarea.make('content').label('Content').rows(6),
			Toggle.make('published').label('Published').default(false),
			TextInput.make('stars').label('Rating').type('number').minValue(0).maxValue(5),
			SelectInput.make('author').label('Author').relationship('author', 'firstname', UserResource),
		]);
	}

	static table() {
		return TableBuilder.make()
			.populate([{ path: 'author' }])
			.columns([
				ImageColumn.make('featuredImage').label('Featured').circular(),
				TextColumn.make('title').label('Title').sortable().searchable(),
				TextColumn.make('authorName')
					.label('Author')
					.formatStateUsing((_value: any, row: any) => {
						if (!row.author) return '-';
						return row.author.lastname
							? `${row.author.firstname} ${row.author.lastname}`
							: row.author.firstname;
					}),
				ToggleColumn.make('published').label('Published').sortable(),
				TextColumn.make('stars').label('Rating').sortable(),
				TextColumn.make('views').label('Views').sortable(),
				TextColumn.make('createdAt').label('Created').sortable().dateTime(),
			])
			.searchable()
			.paginate(10)
			.defaultSort('createdAt', 'desc');
	}

	static relations(): RelationConfig[] {
		return [
			{
				name: 'comments',
				resource: CommentResource,
				localKey: 'id',
				foreignKey: 'post',
			},
		];
	}
}
