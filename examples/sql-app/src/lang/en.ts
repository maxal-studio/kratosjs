// English catalog for the sql-app (namespace: `app`). Authored once and imported
// on BOTH the backend (panel.registerTranslations) and the frontend
// (mountAdminPanel i18n) so a string lives in a single source file.

const en = {
	'users.label': 'User',
	'users.plural': 'Users',
	'users.fields.profile_image': 'Profile Image',
	'users.fields.password': 'Password',
	'users.fields.firstname': 'First name',
	'users.fields.lastname': 'Last name',
	'users.fields.email': 'Email',
	'users.fields.phone': 'Phone Number',
	'users.fields.phone_ph': 'Enter phone number...',
	'users.fields.active': 'Active',
	'users.fields.profile': 'Profile',
	'users.fields.created': 'Created',
	'users.widgets.total': 'Total Users',

	'dashboard.label': 'Dashboard',
	'dashboard.welcome.title': 'Welcome to KratosJs',
	'dashboard.welcome.message': 'This panel is fully localized — switch the language from the account menu.',

	'actions.greet': 'Greet user',
	// ICU plural, used by a custom route and an action.
	greeting: 'Hello {name}! You have {count, plural, one {# message} other {# messages}}.',
};

export default en;
