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
	ChartWidget,
	Widget,
	type FormContext,
	type RelationConfig,
	type NavigationBadge,
} from '@maxal_studio/kratosjs';
import { User } from '../entities/User';
import { PostResource } from './PostResource';
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

	static async getNavigationBadge(): Promise<NavigationBadge | null> {
		const em = this.getPanel().getEm();
		const value = await em.count(this.entity, {});
		return { value, color: 'gray' };
	}

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

	static relations(): RelationConfig[] {
		return [
			{
				name: 'posts',
				resource: PostResource,
				localKey: 'id',
				foreignKey: 'author',
			},
		];
	}

	static widgets(): Widget[] {
		const countUsersByMonth = (users: any[]) => {
			const counts: Record<string, number> = {};
			for (const user of users) {
				if (!user.createdAt) continue;
				const date = new Date(user.createdAt);
				const label = date.toLocaleString('default', { month: 'short', year: '2-digit' });
				counts[label] = (counts[label] || 0) + 1;
			}
			return Object.entries(counts).map(([label, value]) => ({ label, value }));
		};

		return [
			StatsWidget.make('totalUsers')
				.label('Total Users')
				.icon('Users')
				.render(async (em, entity) => em.count(entity, {})),
			StatsWidget.make('activeUsers')
				.label('Active Users')
				.icon('UserCheck')
				.suffix('active')
				.render(async (em, entity) => em.count(entity, { active: true } as any)),
			ChartWidget.make('registrationsTrend')
				.label('Registrations')
				.icon('TrendingUp')
				.type('line')
				.render(async (em, entity) => {
					const users: any[] = await em.find(entity, {}, { orderBy: { createdAt: 'ASC' } } as any);
					return countUsersByMonth(users);
				}),
		];
	}
}
