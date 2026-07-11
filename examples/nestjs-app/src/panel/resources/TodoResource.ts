import {
	BaseResource,
	FormBuilder,
	TextInput,
	SelectInput,
	Toggle,
	TableBuilder,
	TextColumn,
	BadgeColumn,
	ToggleColumn,
} from '@maxal_studio/kratosjs';
import { Todo } from '../entities/Todo';

export class TodoResource extends BaseResource {
	static slug = 'todos';
	static entity = Todo;
	static label = 'Todo';
	static pluralLabel = 'Todos';
	static icon = 'CircleCheck';
	static navigationGroup = 'App';
	static navigationSort = 1;
	static recordTitleAttribute = 'title';

	static form() {
		return FormBuilder.make().schema([
			TextInput.make('title').label('Title').required().min(2).max(120),
			SelectInput.make('priority')
				.label('Priority')
				.options({ low: 'Low', medium: 'Medium', high: 'High' })
				.default('medium'),
			Toggle.make('done').label('Done').default(false),
		]);
	}

	static table() {
		return TableBuilder.make().columns([
			TextColumn.make('title').label('Title').sortable().searchable(),
			BadgeColumn.make('priority').label('Priority').sortable(),
			ToggleColumn.make('done').label('Done').sortable(),
			TextColumn.make('createdAt').label('Created').sortable().dateTime(),
		]);
	}
}
