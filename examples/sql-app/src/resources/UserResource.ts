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
	t,
	type FormContext,
	type NavigationBadge,
} from '@maxal_studio/kratosjs';
import { User } from '../entities/User';
import { userHooks } from '../hooks/userHooks';

function countUsersByMonth(users: any[]): Array<{ label: string; value: number }> {
	const counts: Record<string, number> = {};
	for (const user of users) {
		if (!user.createdAt) continue;
		const date = new Date(user.createdAt);
		const label = date.toLocaleString('default', { month: 'short', year: '2-digit' });
		counts[label] = (counts[label] || 0) + 1;
	}
	return Object.entries(counts).map(([label, value]) => ({ label, value }));
}

export class UserResource extends BaseResource {
	static slug = 'users';

	static entity = User;

	// STATIC labels → getters so they re-resolve against each request's locale.
	static get label() {
		return t('app:users.label');
	}
	static get pluralLabel() {
		return t('app:users.plural');
	}
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
		// t() runs per request inside the request context → already-localized labels.
		return FormBuilder.make().schema([
			FileUpload.make('profileMediaImage').label(t('app:users.fields.profile_image')).image(),
			TextInput.make('password')
				.label(t('app:users.fields.password'))
				.password()
				.required((context: FormContext) => context?.operation === 'create')
				.min(8)
				.max(50)
				.hidden((context: FormContext) => context?.operation === 'view'),
			TextInput.make('firstname').label(t('app:users.fields.firstname')).required().min(2).max(50),
			TextInput.make('lastname').label(t('app:users.fields.lastname')).max(50),
			TextInput.make('email').label(t('app:users.fields.email')).email().required(),
			TextInput.make('phone').label(t('app:users.fields.phone')).placeholder(t('app:users.fields.phone_ph')),
			Toggle.make('active').label(t('app:users.fields.active')).default(true),
		]);
	}

	static table() {
		return TableBuilder.make()
			.columns([
				ImageColumn.make('profileMediaImage').label(t('app:users.fields.profile')).circular(),
				TextColumn.make('firstname').label(t('app:users.fields.firstname')).sortable().searchable(),
				TextColumn.make('lastname').label(t('app:users.fields.lastname')).sortable().searchable(),
				TextColumn.make('email').label(t('app:users.fields.email')).sortable().searchable(),
				ToggleColumn.make('active').label(t('app:users.fields.active')).sortable(),
				TextColumn.make('createdAt').label(t('app:users.fields.created')).sortable().dateTime(),
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
				.label(t('app:users.widgets.total'))
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
