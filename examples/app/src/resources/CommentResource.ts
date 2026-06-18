import { BaseResource, FormBuilder, Textarea, SelectInput, TableBuilder, TextColumn } from '@maxal_studio/kratosjs';
import { Comment } from '../entities/Comment';

export class CommentResource extends BaseResource {
	static slug = 'comments';

	/**
	 * The MikroORM entity
	 */
	static entity = Comment;

	static label = 'Comment';
	static pluralLabel = 'Comments';
	static icon = 'MessageSquare';
	static navigationGroup = 'App';
	static navigationSort = 4;

	static recordTitleAttribute = 'comment';

	static form() {
		return FormBuilder.make().schema([
			Textarea.make('comment').label('Comment').rows(4).required(),
			SelectInput.make('post').label('Post').relationship('post', 'title', 'posts'),
			SelectInput.make('user').label('User').relationship('user', 'name', 'users'),
		]);
	}

	static table() {
		return TableBuilder.make()
			.populate([{ path: 'post' }, { path: 'user' }])
			.columns([
				TextColumn.make('comment').label('Comment').limit(100).searchable(),
				TextColumn.make('postTitle')
					.label('Post')
					.formatStateUsing((_value: any, row: any) => row.post?.title || '-'),
				TextColumn.make('userName')
					.label('User')
					.formatStateUsing((_value: any, row: any) => row.user?.name || '-'),
				TextColumn.make('createdAt').label('Created').sortable().dateTime(),
			])
			.searchable()
			.paginate(10)
			.defaultSort('createdAt', 'desc');
	}
}
