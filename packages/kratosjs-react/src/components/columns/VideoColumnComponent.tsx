import React, { useState, useRef, useEffect } from 'react';
import { ColumnProps } from './TextColumnComponent';
import { formatValue } from '../../utils/tableFormatters';
import { getColumnMediaDimensions } from '../../utils/columnMediaDimensions';
import { Icon } from '../utils/Icon';
import { translate } from '../../i18n/activeLocale';

interface VideoPreviewModalProps {
	isOpen: boolean;
	onClose: () => void;
	videoUrl: string;
	title?: string;
	autoplay?: boolean;
	controls?: boolean;
	loop?: boolean;
	muted?: boolean;
}

function VideoPreviewModal({
	isOpen,
	onClose,
	videoUrl,
	title,
	autoplay = false,
	controls = true,
	loop = false,
	muted = false,
}: VideoPreviewModalProps) {
	const videoRef = useRef<HTMLVideoElement>(null);

	useEffect(() => {
		if (isOpen && videoRef.current && autoplay) {
			videoRef.current.play().catch(() => {
				// Autoplay may be blocked by browser
			});
		}
	}, [isOpen, autoplay]);

	useEffect(() => {
		// Pause video when modal closes
		if (!isOpen && videoRef.current) {
			videoRef.current.pause();
		}
	}, [isOpen]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
			onClick={onClose}>
			<div
				className="relative max-w-4xl w-full mx-4 bg-surface rounded-lg shadow-2xl overflow-hidden"
				onClick={e => e.stopPropagation()}>
				{/* Header */}
				<div className="flex items-center justify-between px-4 py-3 border-b border-border">
					<h3 className="text-lg font-semibold text-fg">{title || translate('core:file.video_preview')}</h3>
					<button
						onClick={onClose}
						className="p-2 rounded-full bg-hover hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
						title={translate('core:modal.close')}>
						<Icon name="X" size={20} className="text-fg" />
					</button>
				</div>

				{/* Video */}
				<div className="p-4 bg-black">
					<video
						ref={videoRef}
						src={videoUrl}
						className="w-full max-h-[70vh] object-contain"
						controls={controls}
						loop={loop}
						muted={muted}
						playsInline
					/>
				</div>
			</div>
		</div>
	);
}

/**
 * Resolve thumbnail URL from column config
 * Supports: field name string, function string (serialized), variants, or default thumbnail
 */
function resolveThumbnail(column: ColumnProps['column'], record: Record<string, any>): string | null {
	const rawValue = record[column.name];

	// Check for variants.thumbnail.url in new format
	if (rawValue && typeof rawValue === 'object' && rawValue.variants?.thumbnail?.url) {
		return rawValue.variants.thumbnail.url;
	}

	// Check for thumbnail function (serialized as string)
	if (column.thumbnailFn) {
		try {
			// eslint-disable-next-line no-new-func
			const thumbnailFn = new Function('return ' + column.thumbnailFn)();
			const result = thumbnailFn(rawValue, record);
			if (result) return result;
		} catch {
			console.warn('Failed to execute thumbnail function');
		}
	}

	// Check for thumbnail field name
	if (column.thumbnailField) {
		const fieldName = column.thumbnailField as string;
		// Support nested field access (e.g., 'mediaFile.thumbnailUrl')
		const fieldValue = fieldName.split('.').reduce((obj: any, key) => obj?.[key], record);
		if (fieldValue) {
			// If it's a string, use it directly; otherwise try to format it
			// Also check if it's the new format { url, key, storage }
			if (typeof fieldValue === 'string') {
				return fieldValue;
			}
			if (typeof fieldValue === 'object' && fieldValue?.url) {
				return fieldValue.url;
			}
		}
	}

	// Fallback to default thumbnail
	if (column.defaultThumbnail) {
		return column.defaultThumbnail as string;
	}

	return null;
}

export function VideoColumnComponent({ column, record }: ColumnProps) {
	const [previewOpen, setPreviewOpen] = useState(false);

	const rawValue = record[column.name];
	// Apply formatter if present (e.g., to extract nested property or prepend URL)
	const formattedValue = formatValue(rawValue, column, record);

	// Extract URL from new format: { key, storage, url }
	let videoUrl: string | null = null;
	if (formattedValue) {
		if (typeof formattedValue === 'object' && formattedValue !== null && formattedValue.url) {
			videoUrl = formattedValue.url;
		} else if (typeof formattedValue === 'string') {
			videoUrl = formattedValue;
		}
	}

	// Get thumbnail URL using the resolver
	const thumbnailUrl = resolveThumbnail(column, record);

	const dimensions = getColumnMediaDimensions(column, 40);
	const placeholderIcon = (column.placeholderIcon as string) || 'Video';

	const getContainerClasses = () => {
		const classes = [
			'relative',
			'flex',
			'items-center',
			'justify-center',
			'cursor-pointer',
			'overflow-hidden',
			'bg-gray-100',
			'dark:bg-gray-800',
			'hover:opacity-80',
			'transition-opacity',
			'group',
		];

		if (column.circular) {
			classes.push('rounded-full');
		} else if (column.square) {
			classes.push('rounded-none');
		} else {
			classes.push('rounded');
		}

		return classes.join(' ');
	};

	const handleClick = () => {
		if (videoUrl) {
			setPreviewOpen(true);
		}
	};

	// If no video URL, show disabled state
	if (!videoUrl) {
		return (
			<div className={`${getContainerClasses()} opacity-50 cursor-not-allowed`} style={dimensions}>
				<Icon name={placeholderIcon} size={20} className="text-gray-400" />
			</div>
		);
	}

	return (
		<>
			<div className={getContainerClasses()} style={dimensions} onClick={handleClick}>
				{thumbnailUrl ? (
					<>
						<img
							src={thumbnailUrl}
							alt={translate('core:common.video_thumbnail')}
							className="w-full h-full object-cover"
						/>
						{/* Play overlay */}
						<div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
							<div className="w-8 h-8 flex items-center justify-center bg-white/90 rounded-full">
								<Icon name="Play" size={16} className="text-gray-800 ml-0.5" />
							</div>
						</div>
					</>
				) : (
					<>
						<Icon name={placeholderIcon} size={24} className="text-gray-500 dark:text-gray-400" />
						{/* Play indicator */}
						<div className="absolute bottom-1 right-1 w-4 h-4 flex items-center justify-center bg-accent rounded-full">
							<Icon name="Play" size={10} className="text-white ml-0.5" />
						</div>
					</>
				)}
			</div>

			<VideoPreviewModal
				isOpen={previewOpen}
				onClose={() => setPreviewOpen(false)}
				videoUrl={videoUrl}
				title={column.previewTitle as string | undefined}
				autoplay={column.autoplay as boolean | undefined}
				controls={column.controls !== false}
				loop={column.loop as boolean | undefined}
				muted={column.muted as boolean | undefined}
			/>
		</>
	);
}
