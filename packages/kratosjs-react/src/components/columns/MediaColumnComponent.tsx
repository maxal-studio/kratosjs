import React, { useState } from 'react';
import { ColumnProps } from './TextColumnComponent';
import { formatValue } from '../../utils/tableFormatters';
import { getColumnMediaDimensions } from '../../utils/columnMediaDimensions';
import { Icon } from '../utils/Icon';
import { MediaPreviewModal } from '../utils/MediaPreviewModal';

type MediaType = 'image' | 'video' | 'audio' | null;

/**
 * Resolve media type from column config
 */
function resolveMediaType(column: ColumnProps['column'], record: Record<string, any>): MediaType {
	const rawValue = record[column.name];

	// Check for media type function (serialized as string)
	if (column.mediaTypeFn) {
		try {
			// eslint-disable-next-line no-new-func
			const mediaTypeFn = new Function('return ' + column.mediaTypeFn)();
			const result = mediaTypeFn(rawValue, record);
			if (result === 'image' || result === 'video' || result === 'audio') return result;
			return 'image';
		} catch {
			console.warn('Failed to execute mediaType function');
			return 'image';
		}
	}

	// Static media type
	if (column.mediaType === 'image' || column.mediaType === 'video' || column.mediaType === 'audio') {
		return column.mediaType;
	}

	// Default to image
	return 'image';
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
			// If it's a string, use it directly; otherwise check for new format
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

export function MediaColumnComponent({ column, record }: ColumnProps) {
	const [previewOpen, setPreviewOpen] = useState(false);

	const rawValue = record[column.name];
	// Apply formatter if present
	const formattedValue = formatValue(rawValue, column, record);

	// Extract URL from new format: { key, storage, url }
	let mediaUrl: string | null = null;
	if (formattedValue) {
		if (typeof formattedValue === 'object' && formattedValue !== null && formattedValue.url) {
			mediaUrl = formattedValue.url;
		} else if (typeof formattedValue === 'string') {
			mediaUrl = formattedValue;
		}
	}

	// Resolve media type
	const mediaType = resolveMediaType(column, record);

	// Get thumbnail URL (for videos)
	const thumbnailUrl = resolveThumbnail(column, record);

	// Get default image URL (for images)
	const defaultImageUrl = column.defaultImageUrl as string | undefined;

	// Aspect ratio (default 16/9; circular columns force 1:1 via getColumnMediaDimensions)
	const dimensions = getColumnMediaDimensions(column, 40);
	const placeholderIcon =
		(column.placeholderIcon as string) ||
		(mediaType === 'video' ? 'Video' : mediaType === 'audio' ? 'Music' : 'Image');
	const isClickable = column.clickable !== false;

	const getContainerClasses = () => {
		const classes = ['relative', 'flex', 'items-center', 'justify-center', 'overflow-hidden'];

		if (column.circular) {
			classes.push('rounded-full');
		} else if (column.square) {
			classes.push('rounded-none');
		} else {
			classes.push('rounded');
		}

		if (isClickable && mediaUrl) {
			classes.push('cursor-pointer', 'hover:opacity-80', 'transition-opacity');
		}

		if (mediaType === 'video') {
			classes.push('bg-gray-100', 'dark:bg-gray-800', 'group');
		}

		return classes.join(' ');
	};

	const handleClick = () => {
		if (!isClickable || !mediaUrl) return;

		if (column.clickAction === 'link') {
			window.open(mediaUrl, '_blank');
		} else {
			setPreviewOpen(true);
		}
	};

	// If media type is null (hidden), show nothing
	if (mediaType === null) {
		return <span className="text-fg-secondary">-</span>;
	}

	// If no media URL
	if (!mediaUrl) {
		// For images, check default image URL
		if (mediaType === 'image' && defaultImageUrl) {
			return (
				<>
					<img
						src={defaultImageUrl}
						alt=""
						className={`object-cover ${getContainerClasses()}`}
						style={dimensions}
						onClick={handleClick}
					/>
					{isClickable && (
						<MediaPreviewModal
							isOpen={previewOpen}
							onClose={() => setPreviewOpen(false)}
							mediaUrl={defaultImageUrl}
							mediaType="image"
							title={column.previewTitle as string | undefined}
						/>
					)}
				</>
			);
		}

		// Show placeholder for video/audio
		if (mediaType === 'video' || mediaType === 'audio') {
			return (
				<div
					className={`${getContainerClasses()} opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800`}
					style={dimensions}>
					<Icon name={placeholderIcon} size={20} className="text-gray-400" />
				</div>
			);
		}

		return <span className="text-fg-secondary">No image</span>;
	}

	// Render video
	if (mediaType === 'video') {
		return (
			<>
				<div
					className={`${getContainerClasses()} bg-gray-100 dark:bg-gray-800`}
					style={dimensions}
					onClick={handleClick}>
					{thumbnailUrl ? (
						<>
							<img src={thumbnailUrl} alt="Video thumbnail" className="w-full h-full object-cover" />
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

				<MediaPreviewModal
					isOpen={previewOpen}
					onClose={() => setPreviewOpen(false)}
					mediaUrl={mediaUrl}
					mediaType="video"
					title={column.previewTitle as string | undefined}
					autoplay={column.autoplay as boolean | undefined}
					controls={column.controls !== false}
					loop={column.loop as boolean | undefined}
					muted={column.muted as boolean | undefined}
				/>
			</>
		);
	}

	// Render audio
	if (mediaType === 'audio') {
		return (
			<>
				<div
					className={`${getContainerClasses()} bg-linear-to-br from-blue-600 to-purple-600`}
					style={dimensions}
					onClick={handleClick}>
					<Icon name={placeholderIcon} size={24} className="text-white" />
					{/* Play indicator */}
					<div className="absolute bottom-1 right-1 w-4 h-4 flex items-center justify-center bg-white/90 rounded-full">
						<Icon name="Play" size={10} className="text-gray-800 ml-0.5" />
					</div>
				</div>

				<MediaPreviewModal
					isOpen={previewOpen}
					onClose={() => setPreviewOpen(false)}
					mediaUrl={mediaUrl}
					mediaType="audio"
					title={column.previewTitle as string | undefined}
					autoplay={column.autoplay as boolean | undefined}
					controls={column.controls !== false}
					loop={column.loop as boolean | undefined}
				/>
			</>
		);
	}

	// Render single image
	return (
		<>
			<img
				src={mediaUrl}
				alt=""
				className={`object-cover ${getContainerClasses()}`}
				style={dimensions}
				onClick={handleClick}
			/>
			<MediaPreviewModal
				isOpen={previewOpen}
				onClose={() => setPreviewOpen(false)}
				mediaUrl={mediaUrl}
				mediaType="image"
				title={column.previewTitle as string | undefined}
			/>
		</>
	);
}
