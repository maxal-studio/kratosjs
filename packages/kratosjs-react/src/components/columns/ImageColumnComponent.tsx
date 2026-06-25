import React, { useState } from 'react';
import { ColumnProps } from './TextColumnComponent';
import { formatValue } from '../../utils/tableFormatters';
import { getColumnMediaDimensions } from '../../utils/columnMediaDimensions';
import { Icon } from '../utils/Icon';
import { DeeplinkWrapper } from './DeeplinkWrapper';
import { translate } from '../../i18n/activeLocale';

interface ImagePreviewModalProps {
	isOpen: boolean;
	onClose: () => void;
	imageUrl: string;
	title?: string;
}

function ImagePreviewModal({ isOpen, onClose, imageUrl, title }: ImagePreviewModalProps) {
	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
			onClick={onClose}>
			<div
				className="relative max-w-4xl max-h-[90vh] p-2 bg-surface rounded-lg shadow-2xl"
				onClick={e => e.stopPropagation()}>
				{/* Header */}
				{title && (
					<div className="px-4 py-2 border-b border-border">
						<h3 className="text-lg font-semibold text-fg">{title}</h3>
					</div>
				)}

				{/* Close button */}
				<button
					onClick={onClose}
					className="absolute top-2 right-2 p-2 rounded-full bg-hover hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors z-10"
					title={translate('core:modal.close')}>
					<Icon name="X" size={20} className="text-fg" />
				</button>

				{/* Image */}
				<div className="p-4">
					<img
						src={imageUrl}
						alt={title || translate('core:common.preview')}
						className="max-w-full max-h-[80vh] object-contain rounded"
					/>
				</div>
			</div>
		</div>
	);
}

export function ImageColumnComponent({ column, record }: ColumnProps) {
	const [previewOpen, setPreviewOpen] = useState(false);
	const [previewUrl, setPreviewUrl] = useState<string>('');

	const rawValue = record[column.name];
	const value = rawValue;
	const hasDeeplink = !!column.deeplink;
	// Apply formatter if present (e.g., to extract nested property or prepend URL)
	const formattedValue = formatValue(rawValue, column, record);

	// Extract URL from new format: { key, storage, url } or use formatted value
	let imageUrl: string | string[] | null = null;
	if (formattedValue) {
		if (typeof formattedValue === 'object' && formattedValue !== null) {
			// New format: { key, storage, url } or array of such objects
			if (Array.isArray(formattedValue)) {
				imageUrl = formattedValue.map((item: any) => (typeof item === 'object' && item?.url ? item.url : item));
			} else if (formattedValue.url) {
				imageUrl = formattedValue.url;
			} else {
				imageUrl = formattedValue;
			}
		} else {
			imageUrl = formattedValue;
		}
	}

	imageUrl = imageUrl || column.defaultImageUrl;

	if (!imageUrl) {
		return <span className="text-fg-secondary">{translate('core:file.no_image')}</span>;
	}

	const getImageClasses = (circular: boolean) => {
		if (circular) {
			return 'h-full w-full object-cover';
		}

		const classes = ['object-cover'];

		if (column.square) {
			classes.push('rounded-none');
		} else {
			classes.push('rounded');
		}

		if (column.clickable || hasDeeplink) {
			classes.push('cursor-pointer hover:opacity-80 transition-opacity');
		}

		return classes.join(' ');
	};

	const handleImageClick = (url: string) => {
		// If there's a deeplink, don't handle the click here - DeeplinkWrapper will handle it
		if (hasDeeplink) {
			return;
		}

		// Fall back to existing clickable behavior
		if (!column.clickable) return;

		if (column.clickAction === 'link') {
			window.open(url, '_blank');
		} else {
			// Default to preview
			setPreviewUrl(url);
			setPreviewOpen(true);
		}
	};

	const dimensions = getColumnMediaDimensions(column, 40);
	const isCircular = !!column.circular;

	// Render single image helper
	const renderImage = (url: string, extraClasses: string = '') => {
		const interactive = column.clickable || hasDeeplink;

		const imgElement = isCircular ? (
			<span
				className={`inline-flex shrink-0 overflow-hidden rounded-full ${interactive ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${extraClasses}`.trim()}
				style={dimensions}
				onClick={() => handleImageClick(url)}>
				<img src={url} alt="" className={getImageClasses(true)} />
			</span>
		) : (
			<img
				src={url}
				alt=""
				className={`${getImageClasses(false)} ${extraClasses}`.trim()}
				style={dimensions}
				onClick={() => handleImageClick(url)}
			/>
		);

		// Wrap in deeplink if exists
		if (hasDeeplink) {
			return (
				<DeeplinkWrapper column={column} record={record} value={value} className="inline-block">
					{imgElement}
				</DeeplinkWrapper>
			);
		}

		return imgElement;
	};

	// Handle arrays (stacked images)
	if (Array.isArray(imageUrl)) {
		const images = column.limit ? imageUrl.slice(0, column.limit) : imageUrl;

		if (column.stacked) {
			return (
				<>
					<div className="flex -space-x-2">
						{images.map((url, idx) => (
							<React.Fragment key={idx}>
								{renderImage(url, 'ring-2 ring-white dark:ring-gray-800')}
							</React.Fragment>
						))}
						{column.limit && imageUrl.length > column.limit && (
							<div
								className={`flex items-center justify-center bg-muted text-fg-secondary text-xs font-medium ring-2 ring-surface ${isCircular ? 'rounded-full' : 'rounded'}`.trim()}
								style={dimensions}>
								+{imageUrl.length - column.limit}
							</div>
						)}
					</div>
					<ImagePreviewModal
						isOpen={previewOpen}
						onClose={() => setPreviewOpen(false)}
						imageUrl={previewUrl}
						title={column.previewTitle as string | undefined}
					/>
				</>
			);
		}

		return (
			<>
				<div className="flex gap-2">
					{images.map((url, idx) => (
						<React.Fragment key={idx}>{renderImage(url)}</React.Fragment>
					))}
				</div>
				<ImagePreviewModal
					isOpen={previewOpen}
					onClose={() => setPreviewOpen(false)}
					imageUrl={previewUrl}
					title={column.previewTitle as string | undefined}
				/>
			</>
		);
	}

	return (
		<>
			{renderImage(imageUrl)}
			<ImagePreviewModal
				isOpen={previewOpen}
				onClose={() => setPreviewOpen(false)}
				imageUrl={previewUrl}
				title={column.previewTitle as string | undefined}
			/>
		</>
	);
}
