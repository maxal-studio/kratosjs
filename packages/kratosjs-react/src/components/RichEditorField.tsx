import React, { useRef, useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import { getFieldError } from '../utils/fieldErrors';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { Node, mergeAttributes } from '@tiptap/core';
import { FieldProps } from '../types';
import { HintDisplay } from './utils/HintDisplay';
import { ViewFieldWrapper } from './utils/ViewFieldWrapper';
import { useToast } from './ui/Toast';
import { authenticatedFetch } from '../api/authenticatedFetch';
import { useValidation } from '../hooks/useValidation';
import { translate } from '../i18n/activeLocale';

// Custom Video extension
const Video = Node.create({
	name: 'video',
	group: 'block',
	atom: true,
	addAttributes() {
		return {
			src: {
				default: null,
			},
			controls: {
				default: true,
			},
		};
	},
	parseHTML() {
		return [
			{
				tag: 'video[src]',
			},
		];
	},
	renderHTML({ HTMLAttributes }) {
		return ['video', mergeAttributes(HTMLAttributes, { controls: true, class: 'max-w-full' })];
	},
	addCommands() {
		return {
			setVideo:
				(options: { src: string }) =>
				({ commands }: any) => {
					return commands.insertContent({
						type: this.name,
						attrs: options,
					});
				},
		} as any;
	},
});

// Custom Audio extension
const Audio = Node.create({
	name: 'audio',
	group: 'block',
	atom: true,
	addAttributes() {
		return {
			src: {
				default: null,
			},
			controls: {
				default: true,
			},
		};
	},
	parseHTML() {
		return [
			{
				tag: 'audio[src]',
			},
		];
	},
	renderHTML({ HTMLAttributes }) {
		return ['audio', mergeAttributes(HTMLAttributes, { controls: true, class: 'max-w-full' })];
	},
	addCommands() {
		return {
			setAudio:
				(options: { src: string }) =>
				({ commands }: any) => {
					return commands.insertContent({
						type: this.name,
						attrs: options,
					});
				},
		} as any;
	},
});

// Custom Embed extension for iframes (YouTube, websites, etc.)
const Embed = Node.create({
	name: 'embed',
	group: 'block',
	atom: true,
	addAttributes() {
		return {
			src: {
				default: null,
			},
			width: {
				default: '100%',
			},
			height: {
				default: '400',
			},
			allow: {
				default: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
			},
			allowFullScreen: {
				default: true,
			},
		};
	},
	parseHTML() {
		return [
			{
				tag: 'iframe[src]',
			},
		];
	},
	renderHTML({ HTMLAttributes }) {
		return [
			'iframe',
			mergeAttributes(HTMLAttributes, {
				class: 'max-w-full rounded',
				frameborder: '0',
				allowfullscreen: HTMLAttributes.allowFullScreen !== false,
			}),
		];
	},
	addCommands() {
		return {
			setEmbed:
				(options: { src: string; width?: string; height?: string; allow?: string }) =>
				({ commands }: any) => {
					return commands.insertContent({
						type: this.name,
						attrs: {
							src: options.src,
							width: options.width || '100%',
							height: options.height || '400',
							allow:
								options.allow ||
								'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
						},
					});
				},
		} as any;
	},
});

// Registry of available TipTap extensions
const AVAILABLE_EXTENSIONS: Record<string, any> = {
	link: Link.configure({
		openOnClick: false,
		HTMLAttributes: {
			class: 'text-accent underline hover:text-accent-hover',
		},
	}),
	image: Image.configure({
		inline: true,
		allowBase64: false,
		HTMLAttributes: {
			class: 'max-w-full h-auto rounded',
		},
	}),
	video: Video,
	audio: Audio,
	embed: Embed,
	underline: Underline,
	subscript: Subscript,
	superscript: Superscript,
	textAlign: TextAlign.configure({
		types: ['heading', 'paragraph'],
	}),
	highlight: Highlight.configure({
		multicolor: true,
	}),
};

interface ToolbarButtonProps {
	onClick: () => void;
	isActive?: boolean;
	disabled?: boolean;
	children: React.ReactNode;
	title?: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
	onClick,
	isActive = false,
	disabled = false,
	children,
	title,
}) => (
	<button
		type="button"
		onClick={onClick}
		disabled={disabled}
		title={title}
		className={`
			p-2 rounded transition-colors
			${isActive ? 'bg-accent-soft text-accent' : 'text-fg hover:bg-muted'}
			${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
		`}>
		{children}
	</button>
);

/**
 * Convert File to base64 string
 */
const fileToBase64 = (file: File): Promise<string> => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result as string;
			resolve(result.split(',')[1]);
		};
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
};

export function RichEditorField({
	name,
	label,
	placeholder,
	helperText,
	hint,
	hintIcon,
	hintColor,
	disabled,
	required,
	toolbarButtons = [
		'bold',
		'italic',
		'underline',
		'strike',
		'code',
		'h1',
		'h2',
		'h3',
		'bulletList',
		'orderedList',
		'blockquote',
		'codeBlock',
		'link',
		'image',
		'video',
		'audio',
		'embed',
		'subscript',
		'superscript',
		'highlight',
		'alignLeft',
		'alignCenter',
		'alignRight',
		'undo',
		'redo',
		'htmlSource',
	],
	extensions = ['link', 'underline', 'subscript', 'superscript', 'highlight', 'textAlign'],
	maxLength,
	fileAttachments,
	embeds,
	htmlSource,
	apiBaseUrl,
	resource,
	mode,
	value,
	validation,
	operation,
}: FieldProps) {
	// View mode: render formatted display
	if (mode === 'view') {
		const htmlContent = value || '';
		return (
			<ViewFieldWrapper label={label}>
				{htmlContent ? (
					<div
						className="prose prose-sm dark:prose-invert max-w-none text-fg"
						dangerouslySetInnerHTML={{ __html: htmlContent }}
					/>
				) : (
					<span className="text-fg-secondary">-</span>
				)}
			</ViewFieldWrapper>
		);
	}

	const {
		setValue,
		watch,
		register,
		formState: { errors: formErrors },
	} = useFormContext();
	const toast = useToast();
	const currentValue = watch(name);
	const imageInputRef = useRef<HTMLInputElement>(null);
	const videoInputRef = useRef<HTMLInputElement>(null);
	const audioInputRef = useRef<HTMLInputElement>(null);
	const [isHtmlView, setIsHtmlView] = React.useState(false);
	const [htmlSourceValue, setHtmlSourceValue] = React.useState('');

	// Evaluate validation conditions with form context
	const validationResult = useValidation(validation?.rules || [], operation, name);
	const isRequired = validationResult.required !== undefined;
	const fieldError = getFieldError(formErrors, name);

	// Register field with React Hook Form for validation
	React.useEffect(() => {
		register(name, validationResult);
	}, [register, name, validationResult]);

	// Compute upload endpoint
	const uploadEndpoint = React.useMemo(() => {
		if (!apiBaseUrl || !resource) return null;
		return `${apiBaseUrl}/${resource}/media/upload`;
	}, [apiBaseUrl, resource]);

	// Build extensions array
	const editorExtensions = React.useMemo(() => {
		const baseExtensions = [
			StarterKit,
			Placeholder.configure({
				placeholder: placeholder || translate('core:editor.start_typing'),
			}),
		];

		// Add image extension if fileAttachments is enabled or if image is in extensions
		if (fileAttachments || extensions.includes('image')) {
			baseExtensions.push(AVAILABLE_EXTENSIONS.image);
		}

		// Add video extension if fileAttachments is enabled or if video is in extensions
		if (fileAttachments || extensions.includes('video')) {
			baseExtensions.push(AVAILABLE_EXTENSIONS.video);
		}

		// Add audio extension if fileAttachments is enabled or if audio is in extensions
		if (fileAttachments || extensions.includes('audio')) {
			baseExtensions.push(AVAILABLE_EXTENSIONS.audio);
		}

		// Add embed extension if embeds is enabled or if embed is in extensions
		if (embeds || extensions.includes('embed')) {
			baseExtensions.push(AVAILABLE_EXTENSIONS.embed);
		}

		// Add custom extensions
		extensions.forEach(extName => {
			if (AVAILABLE_EXTENSIONS[extName] && !['image', 'video', 'audio', 'embed'].includes(extName)) {
				baseExtensions.push(AVAILABLE_EXTENSIONS[extName]);
			}
		});

		return baseExtensions;
	}, [placeholder, extensions, fileAttachments, embeds]);

	const editor = useEditor({
		extensions: editorExtensions,
		content: currentValue || '',
		editable: !disabled,
		onUpdate: ({ editor }) => {
			const html = editor.getHTML();
			// Trigger validation when content changes
			setValue(name, html, { shouldValidate: true });
		},
	});

	// Upload file function
	const uploadFile = useCallback(
		async (file: File): Promise<{ url: string; key: string } | null> => {
			if (!uploadEndpoint) {
				console.warn('No upload endpoint configured');
				return null;
			}

			try {
				const base64 = await fileToBase64(file);
				const response = await authenticatedFetch(
					uploadEndpoint,
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							file: base64,
							filename: file.name,
							contentType: file.type,
							fieldName: name,
							isArray: false,
						}),
					},
					apiBaseUrl,
				);

				if (!response.ok) {
					const error = await response.json();
					throw new Error(`Upload failed: ${error.message || response.statusText}`);
				}

				const result = await response.json();
				return result.data || null;
			} catch (error) {
				console.error('Upload error:', error);
				return null;
			}
		},
		[uploadEndpoint, name],
	);

	// Handle media upload
	const handleMediaUpload = useCallback(
		async (file: File, type: 'image' | 'video' | 'audio') => {
			if (!editor) return;

			const uploadResult = await uploadFile(file);
			if (!uploadResult || !uploadResult.url) {
				toast.error(translate('core:toast.upload_failed'));
				return;
			}

			// Insert media into editor based on type
			if (type === 'image') {
				(editor.chain().focus() as any).setImage({ src: uploadResult.url }).run();
			} else if (type === 'video') {
				(editor.chain().focus() as any).setVideo({ src: uploadResult.url }).run();
			} else if (type === 'audio') {
				(editor.chain().focus() as any).setAudio({ src: uploadResult.url }).run();
			}
		},
		[editor, uploadFile],
	);

	// Handle file input change
	const handleFileInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio') => {
			const file = e.target.files?.[0];
			if (file) {
				handleMediaUpload(file, type);
			}
			// Reset input so same file can be selected again
			e.target.value = '';
		},
		[handleMediaUpload],
	);

	React.useEffect(() => {
		if (editor && currentValue !== editor.getHTML()) {
			editor.commands.setContent(currentValue || '');
		}
	}, [currentValue, editor]);

	// Sync HTML source value when switching to HTML view
	React.useEffect(() => {
		if (isHtmlView && editor) {
			setHtmlSourceValue(editor.getHTML());
		}
	}, [isHtmlView, editor]);

	// Handle HTML source view toggle
	const handleToggleHtmlView = useCallback(() => {
		if (!editor) return;

		if (isHtmlView) {
			// Switching from HTML view to rich text view
			// Parse HTML and update editor
			try {
				editor.commands.setContent(htmlSourceValue);
				setValue(name, htmlSourceValue, { shouldValidate: true });
			} catch (error) {
				console.error('Error parsing HTML:', error);
				toast.error(translate('core:toast.invalid_html'));
			}
		}
		setIsHtmlView(!isHtmlView);
	}, [isHtmlView, editor, htmlSourceValue, name, setValue]);

	const buttonActions: Record<string, { action: () => void; icon: React.ReactElement; title: string }> = {
		bold: {
			action: () => editor?.chain().focus().toggleBold().run(),
			icon: <strong>B</strong>,
			title: translate('core:editor.bold'),
		},
		italic: {
			action: () => editor?.chain().focus().toggleItalic().run(),
			icon: <em>I</em>,
			title: translate('core:editor.italic'),
		},
		strike: {
			action: () => editor?.chain().focus().toggleStrike().run(),
			icon: <s>S</s>,
			title: translate('core:editor.strikethrough'),
		},
		code: {
			action: () => editor?.chain().focus().toggleCode().run(),
			icon: <code>{'</>'}</code>,
			title: translate('core:editor.code'),
		},
		h1: {
			action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
			icon: <span className="text-lg font-bold">H1</span>,
			title: translate('core:editor.heading1'),
		},
		h2: {
			action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
			icon: <span className="text-base font-bold">H2</span>,
			title: translate('core:editor.heading2'),
		},
		h3: {
			action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
			icon: <span className="text-sm font-bold">H3</span>,
			title: translate('core:editor.heading3'),
		},
		bulletList: {
			action: () => editor?.chain().focus().toggleBulletList().run(),
			icon: (
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			),
			title: translate('core:editor.bullet_list'),
		},
		orderedList: {
			action: () => editor?.chain().focus().toggleOrderedList().run(),
			icon: (
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M3 12h18M3 20h18" />
				</svg>
			),
			title: translate('core:editor.ordered_list'),
		},
		blockquote: {
			action: () => editor?.chain().focus().toggleBlockquote().run(),
			icon: <span>"</span>,
			title: translate('core:editor.blockquote'),
		},
		codeBlock: {
			action: () => editor?.chain().focus().toggleCodeBlock().run(),
			icon: <code>{'{ }'}</code>,
			title: translate('core:editor.code_block'),
		},
		undo: {
			action: () => editor?.chain().focus().undo().run(),
			icon: (
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
					/>
				</svg>
			),
			title: translate('core:editor.undo'),
		},
		redo: {
			action: () => editor?.chain().focus().redo().run(),
			icon: (
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"
					/>
				</svg>
			),
			title: translate('core:editor.redo'),
		},
		link: {
			action: () => {
				const url = window.prompt('Enter URL:');
				if (url) {
					editor?.chain().focus().setLink({ href: url }).run();
				}
			},
			icon: (
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
					/>
				</svg>
			),
			title: translate('core:editor.link'),
		},
		underline: {
			action: () => editor?.chain().focus().toggleUnderline().run(),
			icon: <u>U</u>,
			title: translate('core:editor.underline'),
		},
		subscript: {
			action: () => editor?.chain().focus().toggleSubscript().run(),
			icon: (
				<span>
					X<sub className="text-xs">2</sub>
				</span>
			),
			title: translate('core:editor.subscript'),
		},
		superscript: {
			action: () => editor?.chain().focus().toggleSuperscript().run(),
			icon: (
				<span>
					X<sup className="text-xs">2</sup>
				</span>
			),
			title: translate('core:editor.superscript'),
		},
		highlight: {
			action: () => editor?.chain().focus().toggleHighlight().run(),
			icon: (
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M7 21h10M12 16v5M5 3l14 14L5 3z"
					/>
				</svg>
			),
			title: translate('core:editor.highlight'),
		},
		alignLeft: {
			action: () => editor?.chain().focus().setTextAlign('left').run(),
			icon: (
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16" />
				</svg>
			),
			title: translate('core:editor.align_left'),
		},
		alignCenter: {
			action: () => editor?.chain().focus().setTextAlign('center').run(),
			icon: (
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M4 18h16" />
				</svg>
			),
			title: translate('core:editor.align_center'),
		},
		alignRight: {
			action: () => editor?.chain().focus().setTextAlign('right').run(),
			icon: (
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M4 18h16" />
				</svg>
			),
			title: translate('core:editor.align_right'),
		},
		image: {
			action: () => {
				if (fileAttachments && imageInputRef.current) {
					imageInputRef.current.click();
				}
			},
			icon: (
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
					/>
				</svg>
			),
			title: translate('core:editor.insert_image'),
		},
		video: {
			action: () => {
				if (fileAttachments && videoInputRef.current) {
					videoInputRef.current.click();
				}
			},
			icon: (
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
					/>
				</svg>
			),
			title: translate('core:editor.insert_video'),
		},
		audio: {
			action: () => {
				if (fileAttachments && audioInputRef.current) {
					audioInputRef.current.click();
				}
			},
			icon: (
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
					/>
				</svg>
			),
			title: translate('core:editor.insert_audio'),
		},
		embed: {
			action: () => {
				const url = window.prompt('Enter embed URL (YouTube, website, etc.):');
				if (url) {
					// Try to convert YouTube URL to embed format
					let embedUrl = url;
					const youtubeRegex =
						/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
					const youtubeMatch = url.match(youtubeRegex);
					if (youtubeMatch) {
						embedUrl = `https://www.youtube.com/embed/${youtubeMatch[1]}`;
					}

					(editor?.chain().focus() as any)
						.setEmbed({
							src: embedUrl,
							width: '100%',
							height: '400',
						})
						.run();
				}
			},
			icon: (
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
					/>
				</svg>
			),
			title: translate('core:editor.insert_embed'),
		},
		htmlSource: {
			action: handleToggleHtmlView,
			icon: (
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l3 3-3 3M18 6l-3 3 3 3" />
				</svg>
			),
			title: translate('core:editor.html_source'), // Title will be updated dynamically in render
		},
	};

	return (
		<div className="space-y-2">
			{label && (
				<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
					{label}
					{isRequired && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
				</label>
			)}

			{helperText && <p className="text-sm text-gray-500 dark:text-gray-400">{helperText}</p>}

			<HintDisplay hint={hint} hintIcon={hintIcon} hintColor={hintColor} />

			{/* Validation Error */}
			{fieldError && <p className="text-sm text-red-600 dark:text-red-400">{fieldError.message as string}</p>}

			<div className="border border-border rounded-lg overflow-hidden">
				{/* Toolbar */}
				<div className="flex flex-wrap gap-1 p-2 bg-muted border-b border-border">
					{toolbarButtons.map(button => {
						const action = buttonActions[button];
						if (!action) return null;

						let isActive = false;
						if (editor) {
							if (button === 'bold') isActive = editor.isActive('bold');
							else if (button === 'italic') isActive = editor.isActive('italic');
							else if (button === 'strike') isActive = editor.isActive('strike');
							else if (button === 'code') isActive = editor.isActive('code');
							else if (button === 'h1') isActive = editor.isActive('heading', { level: 1 });
							else if (button === 'h2') isActive = editor.isActive('heading', { level: 2 });
							else if (button === 'h3') isActive = editor.isActive('heading', { level: 3 });
							else if (button === 'bulletList') isActive = editor.isActive('bulletList');
							else if (button === 'orderedList') isActive = editor.isActive('orderedList');
							else if (button === 'blockquote') isActive = editor.isActive('blockquote');
							else if (button === 'codeBlock') isActive = editor.isActive('codeBlock');
							else if (button === 'link') isActive = editor.isActive('link');
							else if (button === 'image') isActive = editor.isActive('image');
							else if (button === 'video') isActive = editor.isActive('video');
							else if (button === 'audio') isActive = editor.isActive('audio');
							else if (button === 'embed') isActive = editor.isActive('embed');
							else if (button === 'underline') isActive = editor.isActive('underline');
							else if (button === 'subscript') isActive = editor.isActive('subscript');
							else if (button === 'superscript') isActive = editor.isActive('superscript');
							else if (button === 'highlight') isActive = editor.isActive('highlight');
							else if (button === 'alignLeft') isActive = editor.isActive({ textAlign: 'left' });
							else if (button === 'alignCenter') isActive = editor.isActive({ textAlign: 'center' });
							else if (button === 'alignRight') isActive = editor.isActive({ textAlign: 'right' });
						}

						// Hide image/video/audio buttons if fileAttachments is disabled
						if ((button === 'image' || button === 'video' || button === 'audio') && !fileAttachments) {
							return null;
						}

						// Hide embed button if embeds is disabled
						if (button === 'embed' && !embeds) {
							return null;
						}

						// Hide HTML source button if htmlSource is disabled
						if (button === 'htmlSource' && !htmlSource) {
							return null;
						}

						// Update HTML source button active state and title
						let buttonTitle = action.title;
						if (button === 'htmlSource') {
							isActive = isHtmlView;
							buttonTitle = isHtmlView
								? translate('core:editor.rich_text_view')
								: translate('core:editor.html_source');
						}

						return (
							<ToolbarButton
								key={button}
								onClick={action.action}
								isActive={isActive}
								disabled={
									disabled ||
									(fileAttachments &&
										!uploadEndpoint &&
										(button === 'image' || button === 'video' || button === 'audio'))
								}
								title={buttonTitle}>
								{action.icon}
							</ToolbarButton>
						);
					})}
				</div>

				{/* Hidden file inputs */}
				{fileAttachments && (
					<>
						<input
							ref={imageInputRef}
							type="file"
							accept="image/*"
							style={{ display: 'none' }}
							onChange={e => handleFileInputChange(e, 'image')}
						/>
						<input
							ref={videoInputRef}
							type="file"
							accept="video/*"
							style={{ display: 'none' }}
							onChange={e => handleFileInputChange(e, 'video')}
						/>
						<input
							ref={audioInputRef}
							type="file"
							accept="audio/*"
							style={{ display: 'none' }}
							onChange={e => handleFileInputChange(e, 'audio')}
						/>
					</>
				)}

				{/* Editor or HTML Source View */}
				{isHtmlView ? (
					<div className="p-4 min-h-[200px] k-input">
						<textarea
							value={htmlSourceValue}
							onChange={e => setHtmlSourceValue(e.target.value)}
							disabled={disabled}
							className="w-full h-full min-h-[200px] font-mono text-sm k-input resize-none focus:outline-none"
							placeholder={translate('core:editor.html_placeholder')}
						/>
					</div>
				) : (
					<div
						className={`
							rich-editor-content p-4 min-h-[200px]
							${disabled ? 'bg-muted cursor-not-allowed' : 'k-input'}
						`}
						style={{
							outline: 'none',
						}}
						onDrop={e => {
							if (!fileAttachments || !uploadEndpoint || disabled) return;

							e.preventDefault();
							const files = Array.from(e.dataTransfer.files);
							files.forEach(file => {
								if (file.type.startsWith('image/')) {
									handleMediaUpload(file, 'image');
								} else if (file.type.startsWith('video/')) {
									handleMediaUpload(file, 'video');
								} else if (file.type.startsWith('audio/')) {
									handleMediaUpload(file, 'audio');
								}
							});
						}}
						onDragOver={e => {
							if (fileAttachments && uploadEndpoint && !disabled) {
								e.preventDefault();
							}
						}}>
						<EditorContent editor={editor} />
					</div>
				)}
			</div>

			{maxLength && editor && (
				<p className="text-xs text-gray-500 dark:text-gray-400 text-right">
					{editor.storage.characterCount?.characters() || 0} / {maxLength}
				</p>
			)}
		</div>
	);
}
