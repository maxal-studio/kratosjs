import { defineConfig, type DefaultTheme } from 'vitepress';

const sidebar: DefaultTheme.SidebarMulti = {
	'/': [
		{
			text: 'Introduction',
			items: [
				{ text: 'Overview', link: '/' },
				{ text: 'Getting Started', link: '/getting-started' },
				{ text: 'Build with AI', link: '/build-with-ai' },
				{ text: 'Backend Setup', link: '/backend-setup' },
				{ text: 'Database & MikroORM', link: '/database/overview' },
				{ text: 'HTTP Adapters', link: '/backend/http-adapters' },
				{ text: 'Views (SSR)', link: '/backend/views' },
				{ text: 'Migrating to v3', link: '/migration-v3' },
				{ text: 'Migrating to v2', link: '/migration-v2' },
			],
		},
	],
	'/backend/': [
		{
			text: 'Backend & HTTP',
			items: [
				{ text: 'HTTP Adapters', link: '/backend/http-adapters' },
				{ text: 'Views (SSR)', link: '/backend/views' },
				{ text: 'NestJS Integration', link: '/backend/nestjs' },
				{ text: 'Writing an Adapter', link: '/backend/writing-an-adapter' },
			],
		},
	],
	'/resources/': [
		{
			text: 'Resources',
			items: [
				{ text: 'Overview', link: '/resources/overview' },
				{ text: 'Creating Resources', link: '/resources/creating-resources' },
				{ text: 'Actions', link: '/resources/actions' },
				{ text: 'Hooks', link: '/resources/hooks' },
				{ text: 'Relations', link: '/resources/relations' },
				{ text: 'Widgets', link: '/resources/widgets' },
				{ text: 'Custom Widgets', link: '/resources/custom-widgets' },
			],
		},
	],
	'/pages/': [
		{
			text: 'Pages',
			items: [
				{ text: 'Overview', link: '/pages/overview' },
				{ text: 'Creating Pages', link: '/pages/creating-pages' },
				{ text: 'Blocks', link: '/pages/blocks' },
				{ text: 'Custom Blocks', link: '/pages/custom-blocks' },
			],
		},
	],
	'/forms/': [
		{
			text: 'Forms',
			items: [
				{ text: 'Overview', link: '/forms/overview' },
				{ text: 'Text Input', link: '/forms/text-input' },
				{ text: 'Select', link: '/forms/select' },
				{ text: 'Textarea', link: '/forms/textarea' },
				{ text: 'Checkbox', link: '/forms/checkbox' },
				{ text: 'Toggle', link: '/forms/toggle' },
				{ text: 'Radio', link: '/forms/radio' },
				{ text: 'Date Time Picker', link: '/forms/date-time-picker' },
				{ text: 'Color Picker', link: '/forms/color-picker' },
				{ text: 'File Upload', link: '/forms/file-upload' },
				{ text: 'Rich Editor', link: '/forms/rich-editor' },
				{ text: 'Repeater', link: '/forms/repeater' },
				{ text: 'Section', link: '/forms/section' },
				{ text: 'Group', link: '/forms/group' },
				{ text: 'Tags Input', link: '/forms/tags-input' },
				{ text: 'Tabs', link: '/forms/tabs' },
				{ text: 'Hidden', link: '/forms/hidden' },
				{ text: 'Custom Fields', link: '/forms/custom-fields' },
			],
		},
	],
	'/tables/': [
		{
			text: 'Tables',
			items: [
				{ text: 'Overview', link: '/tables/overview' },
				{ text: 'Grouping & Metrics', link: '/tables/grouping' },
				{ text: 'Text Column', link: '/tables/text-column' },
				{ text: 'Icon Column', link: '/tables/icon-column' },
				{ text: 'Image Column', link: '/tables/image-column' },
				{ text: 'Video Column', link: '/tables/video-column' },
				{ text: 'Media Column', link: '/tables/media-column' },
				{ text: 'Color Column', link: '/tables/color-column' },
				{ text: 'Tags Column', link: '/tables/tags-column' },
				{ text: 'Badge Column', link: '/tables/badge-column' },
				{ text: 'View Column', link: '/tables/view-column' },
				{ text: 'Toggle Column', link: '/tables/toggle-column' },
				{ text: 'Checkbox Column', link: '/tables/checkbox-column' },
				{ text: 'Select Column', link: '/tables/select-column' },
				{ text: 'Text Input Column', link: '/tables/text-input-column' },
				{ text: 'Filters', link: '/tables/filters' },
				{ text: 'Date Filter', link: '/tables/date-filter' },
				{ text: 'Custom Filter', link: '/tables/custom-filter' },
				{ text: 'Tabs', link: '/tables/tabs' },
				{ text: 'Custom Columns', link: '/tables/custom-columns' },
			],
		},
	],
	'/authentication/': [
		{
			text: 'Authentication',
			items: [
				{ text: 'Overview', link: '/authentication/overview' },
				{ text: 'Email Auth', link: '/authentication/email-auth' },
				{ text: 'OAuth', link: '/authentication/oauth' },
				{ text: 'Extending Login', link: '/authentication/extending-login' },
			],
		},
	],
	'/media/': [
		{
			text: 'Media',
			items: [
				{ text: 'Overview', link: '/media/overview' },
				{ text: 'Hooks', link: '/media/hooks' },
				{ text: 'Local Storage', link: '/media/local-storage' },
				{ text: 'S3 Storage', link: '/media/s3-storage' },
			],
		},
	],
	'/i18n/': [
		{
			text: 'Internationalization',
			items: [
				{ text: 'Overview', link: '/i18n/overview' },
				{ text: 'Backend', link: '/i18n/backend' },
				{ text: 'Frontend', link: '/i18n/frontend' },
				{ text: 'Plugins', link: '/i18n/plugins' },
			],
		},
	],
	'/customization/': [
		{
			text: 'Customization',
			items: [{ text: 'Slots', link: '/customization/slots' }],
		},
	],
	'/plugins/': [
		{
			text: 'Plugins',
			items: [
				{ text: 'Overview', link: '/plugins/overview' },
				{ text: 'Creating Plugins', link: '/plugins/creating-plugins' },
				{ text: 'Global Configuration', link: '/plugins/global-configuration' },
				{ text: 'Entities & Migrations', link: '/plugins/migrations' },
				{ text: 'Custom Components', link: '/plugins/custom-components' },
				{ text: 'Auth Challenge Plugins', link: '/plugins/auth-plugins' },
			],
		},
	],
};

export default defineConfig({
	title: 'KratosJs',
	description: 'A powerful admin panel builder for Node.js and React',
	base: '/',
	head: [['link', { rel: 'icon', type: 'image/png', href: '/icon.png' }]],
	vite: {
		resolve: {
			preserveSymlinks: true,
		},
		server: {
			fs: {
				// Allow serving files from the repo root (core docs live in ../../docs/)
				allow: ['..', '../..'],
			},
		},
	},
	themeConfig: {
		logo: {
			src: '/icon.png',
			alt: 'KratosJs',
			width: 36,
			height: 36,
		},
		siteTitle: 'KratosJs',
		appearance: true,
		footer: {
			message: 'Built with KratosJs — MIT License',
			copyright: 'Copyright © 2026 KratosJs',
		},
		outline: {
			level: [2, 3],
			label: 'On this page',
		},
		nav: [
			{ text: 'Guide', link: '/getting-started' },
			{ text: 'Resources', link: '/resources/overview' },
			{ text: 'Pages', link: '/pages/overview' },
			{ text: 'Forms', link: '/forms/overview' },
			{ text: 'Tables', link: '/tables/overview' },
			{ text: 'Auth', link: '/authentication/overview' },
			{ text: 'Media', link: '/media/overview' },
			{ text: 'i18n', link: '/i18n/overview' },
			{ text: 'Slots', link: '/customization/slots' },
			{ text: 'Plugins', link: '/plugins/overview' },
		],
		sidebar,
		socialLinks: [{ icon: 'github', link: 'https://github.com/maxal-studio/kratosjs' }],
		search: {
			provider: 'local',
		},
	},
});
