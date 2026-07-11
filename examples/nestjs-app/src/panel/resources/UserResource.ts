import {
	BaseResource,
	FormBuilder,
	TextInput,
	Toggle,
	TableBuilder,
	TextColumn,
	ToggleColumn,
	type FormContext,
} from '@maxal_studio/kratosjs';
import { User } from '../entities/User';

export class UserResource extends BaseResource {
	static slug = 'users';
	static entity = User;
	static label = 'User';
	static pluralLabel = 'Users';
	static icon = 'Users';
	static navigationGroup = 'App';
	static navigationSort = 2;
	static recordTitleAttribute = 'name';
	static globallySearchableAttributes = ['name', 'email'];

	static form() {
		return FormBuilder.make().schema([
			TextInput.make('name').label('Name').required().min(2).max(80),
			TextInput.make('email').label('Email').email().required(),
			TextInput.make('password')
				.label('Password')
				.password()
				.min(8)
				.max(50)
				.required((ctx: FormContext) => ctx?.operation === 'create')
				.hidden((ctx: FormContext) => ctx?.operation === 'view'),
			Toggle.make('active').label('Active').default(true),
		]);
	}

	static table() {
		return TableBuilder.make().columns([
			TextColumn.make('name').label('Name').sortable().searchable(),
			TextColumn.make('email').label('Email').sortable().searchable(),
			ToggleColumn.make('active').label('Active').sortable(),
		]);
	}
}
