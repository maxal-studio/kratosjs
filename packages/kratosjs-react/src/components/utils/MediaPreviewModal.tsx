import React, { useEffect, useRef } from 'react';
import { Icon } from './Icon';
import { translate } from '../../i18n/activeLocale';

export type MediaType = 'image' | 'video' | 'audio';

export interface MediaPreviewModalProps {
	isOpen: boolean;
	onClose: () => void;
	mediaUrl: string;
	mediaType: MediaType;
	title?: string;
	autoplay?: boolean;
	controls?: boolean;
	loop?: boolean;
	muted?: boolean;
}

export function MediaPreviewModal({
	isOpen,
	onClose,
	mediaUrl,
	mediaType,
	title,
	autoplay = false,
	controls = true,
	loop = false,
	muted = false,
}: MediaPreviewModalProps) {
	const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);

	useEffect(() => {
		if (isOpen && mediaRef.current && autoplay && (mediaType === 'video' || mediaType === 'audio')) {
			mediaRef.current.play().catch(() => {
				// Autoplay may be blocked by browser
			});
		}
	}, [isOpen, autoplay, mediaType]);

	useEffect(() => {
		// Pause media when modal closes
		if (!isOpen && mediaRef.current) {
			mediaRef.current.pause();
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
					<h3 className="text-lg font-semibold text-fg">
						{title ||
							(mediaType === 'video'
								? 'Video Preview'
								: mediaType === 'audio'
									? 'Audio Player'
									: 'Image Preview')}
					</h3>
					<button
						onClick={onClose}
						className="p-2 rounded-full bg-hover hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
						title={translate('core:modal.close')}>
						<Icon name="X" size={20} className="text-fg" />
					</button>
				</div>

				{/* Content */}
				<div className={mediaType === 'video' ? 'p-4 bg-black' : 'p-4'}>
					{mediaType === 'video' ? (
						<video
							ref={el => {
								mediaRef.current = el;
							}}
							src={mediaUrl}
							className="w-full max-h-[70vh] object-contain"
							controls={controls}
							loop={loop}
							muted={muted}
							playsInline
						/>
					) : mediaType === 'audio' ? (
						<div className="flex flex-col items-center gap-4 py-4">
							<div className="w-24 h-24 rounded-full bg-linear-to-br from-blue-600 to-purple-600 flex items-center justify-center">
								<Icon name="Music" size={48} className="text-white" />
							</div>
							<audio
								ref={el => {
									mediaRef.current = el;
								}}
								src={mediaUrl}
								className="w-full max-w-md"
								controls={controls}
								loop={loop}
							/>
						</div>
					) : (
						<img
							src={mediaUrl}
							alt={title || translate('core:common.preview')}
							className="max-w-full max-h-[80vh] object-contain mx-auto rounded"
						/>
					)}
				</div>
			</div>
		</div>
	);
}
