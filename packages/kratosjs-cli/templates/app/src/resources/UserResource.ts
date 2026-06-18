import {
	BaseResource,
	FormBuilder,
	TextInput,
	Toggle,
	FileUpload,
	TableBuilder,
	TextColumn,
	ToggleColumn,
	ImageColumn,
	StatsWidget,
	Widget,
	type FormContext,
} from '@maxal_studio/kratosjs';
import { User } from '../entities/User';
import { userHooks } from '../hooks/userHooks';

export class UserResource extends BaseResource {
	static slug = 'users';

	static entity = User;

	static label = 'User';
	static pluralLabel = 'Users';
	static icon = 'Users';
	static navigationGroup = 'App';
	static navigationSort = 1;

	static recordTitleAttribute = (record: any) =>
		record.lastname ? `${record.firstname} ${record.lastname}` : record.firstname;
	static recordFeaturedImageAttribute = 'profileMediaImage';
	static globallySearchableAttributes = ['firstname', 'lastname', 'email'];

	static form() {
		return FormBuilder.make().schema([
			FileUpload.make('profileMediaImage').label('Profile Image').image(),
			TextInput.make('password')
				.label('Password')
				.password()
				.required((context: FormContext) => context?.operation === 'create')
				.min(8)
				.max(50)
				.hidden((context: FormContext) => context?.operation === 'view'),
			TextInput.make('firstname').label('First name').required().min(2).max(50),
			TextInput.make('lastname').label('Last name').max(50),
			TextInput.make('email').label('Email').email().required(),
			TextInput.make('phone').label('Phone Number').placeholder('Enter phone number...'),
			Toggle.make('active').label('Active').default(true),
		]);
	}

	static table() {
		return TableBuilder.make()
			.columns([
				ImageColumn.make('profileMediaImage').label('Profile').circular(),
				TextColumn.make('firstname').label('First name').sortable().searchable(),
				TextColumn.make('lastname').label('Last name').sortable().searchable(),
				TextColumn.make('email').label('Email').sortable().searchable(),
				ToggleColumn.make('active').label('Active').sortable(),
				TextColumn.make('createdAt').label('Created').sortable().dateTime(),
			])
			.searchable()
			.paginate(10)
			.defaultSort('createdAt', 'desc');
	}

	static hooks() {
		return userHooks;
	}

	static widgets(): Widget[] {
		return [
			StatsWidget.make('totalUsers')
				.label('Total Users')
				.icon('Users')
				.render(async (em, entity) => em.count(entity, {})),
		];
	}
}
