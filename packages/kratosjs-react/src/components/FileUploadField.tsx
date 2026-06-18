import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { getFieldError } from '../utils/fieldErrors';
import { useDropzone } from 'react-dropzone';
import { Check, Upload, File, Trash2, Loader2 } from 'lucide-react';
import { FieldProps } from '../types';
import { HintDisplay } from './utils/HintDisplay';
import { ViewFieldWrapper } from './utils/ViewFieldWrapper';
import { MediaPreviewModal } from './utils/MediaPreviewModal';
import { authenticatedFetch } from '../api/authenticatedFetch';
import { useValidation } from '../hooks/useValidation';

/**
 * Represents a file in the upload field
 */
interface FileItem {
	/** Unique identifier for this file item */
	id: string;
	/** Storage key (from server after upload) */
	key?: string;
	/** Storage adapter name */
	bucket?: string;
	/** Display URL (server URL or local blob) */
	url?: string;
	/** Local file object (for new uploads) */
	file?: File;
	/** Local blob URL for preview */
	blobUrl?: string;
	/** Upload status */
	status: 'pending' | 'uploading' | 'uploaded' | 'existing' | 'error';
	/** Error message if status is 'error' */
	error?: string;
}

/**
 * Server response for media upload
 */
interface UploadResponse {
	data: {
		url: string;
		key: string;
	};
}

/**
 * Generate a unique ID for file tracking
 */
const generateId = () => `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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

/**
 * Format bytes to human readable size
 */
const formatFileSize = (bytes: number): string => {
	if (bytes === 0) return '0 Bytes';
	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
};

/**
 * Check if a URL points to an image
 */
const isImageUrl = (url?: string): boolean => {
	if (!url) return false;
	if (url.startsWith('blob:')) return true;
	return /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(url);
};

/**
 * Check if a URL points to a video
 */
const isVideoUrl = (url?: string): boolean => {
	if (!url) return false;
	return /\.(mp4|webm|ogg|mov|m4v)$/i.test(url);
};

/**
 * Check if a URL points to an audio file
 */
const isAudioUrl = (url?: string): boolean => {
	if (!url) return false;
	return /\.(mp3|wav|ogg|m4a)$/i.test(url);
};

type ViewMediaType = 'image' | 'video' | 'audio';

function FileUploadViewField({ label, value }: { label?: string; value: any }) {
	const [previewOpen, setPreviewOpen] = useState(false);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [previewType, setPreviewType] = useState<ViewMediaType>('image');

	const displayValue = value || null;
	const filesArray = Array.isArray(displayValue) ? displayValue : displayValue ? [displayValue] : [];

	if (filesArray.length === 0) {
		return <ViewFieldWrapper label={label}>-</ViewFieldWrapper>;
	}

	const openPreview = (url: string, type: ViewMediaType) => {
		setPreviewUrl(url);
		setPreviewType(type);
		setPreviewOpen(true);
	};

	return (
		<ViewFieldWrapper label={label}>
			<div className="flex flex-wrap gap-4">
				{filesArray.map((file: any, index: number) => {
					const fileUrl = typeof file === 'object' && file !== null ? file.url || file.key : file;
					if (!fileUrl) {
						return null;
					}

					const image = isImageUrl(fileUrl);
					const video = isVideoUrl(fileUrl);

					if (video) {
						return (
							<div key={index} className="relative">
								<video
									src={fileUrl}
									controls
									className="w-72 h-44 rounded-lg border border-border object-cover bg-black"
									onClick={e => {
										e.stopPropagation();
										openPreview(fileUrl, 'video');
									}}
								/>
							</div>
						);
					}

					if (image) {
						return (
							<div key={index} className="relative">
								<img
									src={fileUrl}
									alt={`${label || 'Image'} ${index + 1}`}
									className="w-40 h-40 object-cover rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity"
									onClick={() => openPreview(fileUrl, 'image')}
								/>
							</div>
						);
					}

					return (
						<div
							key={index}
							className="flex items-center gap-2 p-2 border border-border rounded-lg bg-surface">
							<File size={20} className="text-fg-secondary" />
							<span className="text-sm text-fg">
								{typeof file === 'object' && file !== null ? file.key || 'File' : 'File'}
							</span>
						</div>
					);
				})}
			</div>

			{previewUrl && (
				<MediaPreviewModal
					isOpen={previewOpen}
					onClose={() => setPreviewOpen(false)}
					mediaUrl={previewUrl}
					mediaType={previewType}
					title={label}
					autoplay={previewType === 'video'}
					controls
				/>
			)}
		</ViewFieldWrapper>
	);
}

export function FileUploadField({
	name,
	label,
	helperText,
	hint,
	hintIcon,
	hintColor,
	acceptedFileTypes = [],
	maxSize,
	minSize,
	multiple = false,
	maxFiles,
	disabled,
	required,
	visibility,
	directory,
	bucket,
	apiBaseUrl,
	resource,
	mode,
	value,
	validation,
	operation,
}: FieldProps & {
	visibility?: 'public' | 'private';
	directory?: string;
	bucket?: string;
	apiBaseUrl?: string;
	resource?: string;
}) {
	// View mode: render formatted display (with image/video preview)
	if (mode === 'view') {
		return <FileUploadViewField label={label} value={value} />;
	}

	const {
		setValue,
		watch,
		register,
		formState: { errors: formErrors },
	} = useFormContext();
	const [files, setFiles] = useState<FileItem[]>([]);
	const [errors, setErrors] = useState<string[]>([]);
	const initializedRef = useRef(false);

	// Preview state for edit mode
	const [editPreviewOpen, setEditPreviewOpen] = useState(false);
	const [editPreviewUrl, setEditPreviewUrl] = useState<string | null>(null);
	const [editPreviewType, setEditPreviewType] = useState<ViewMediaType>('image');

	const currentValue = watch(name);

	// Evaluate validation conditions with form context
	const validationResult = useValidation(validation?.rules || [], operation, name);
	const isRequired = validationResult.required !== undefined;
	const fieldError = getFieldError(formErrors, name);

	// Register field with React Hook Form for validation
	React.useEffect(() => {
		register(name, validationResult);
	}, [register, name, validationResult]);

	// Compute endpoints
	// Use generic media endpoint if no resource is provided, otherwise use resource-specific endpoint
	const uploadEndpoint = useMemo(() => {
		if (!apiBaseUrl) return null;
		if (resource) {
			return `${apiBaseUrl}/${resource}/media/upload`;
		}
		return `${apiBaseUrl}/media/upload`;
	}, [apiBaseUrl, resource]);

	const deleteEndpoint = useMemo(() => {
		if (!apiBaseUrl) return null;
		if (resource) {
			return `${apiBaseUrl}/${resource}/media/delete`;
		}
		return `${apiBaseUrl}/media/delete`;
	}, [apiBaseUrl, resource]);

	/**
	 * Initialize from existing value (server sends { url, key } objects)
	 * Only runs once on mount if there's an initial value
	 */
	useEffect(() => {
		if (initializedRef.current) return;
		if (!currentValue) return;

		initializedRef.current = true;
		const existingFiles: FileItem[] = [];
		const keys: string[] = [];

		const processItem = (item: any): FileItem | null => {
			if (!item) return null;

			// New format: { key, bucket, url }
			if (typeof item === 'object' && item.key) {
				keys.push(item.key);
				return {
					id: generateId(),
					key: item.key,
					bucket: item.bucket,
					url: item.url || item.key, // Use url if available, fallback to key
					status: 'existing',
				};
			}

			// String form: treat the value as a storage key
			if (typeof item === 'string') {
				keys.push(item);
				return {
					id: generateId(),
					key: item,
					url: item,
					status: 'existing',
				};
			}

			return null;
		};

		if (Array.isArray(currentValue)) {
			currentValue.forEach(item => {
				const fileItem = processItem(item);
				if (fileItem) existingFiles.push(fileItem);
			});
		} else {
			const fileItem = processItem(currentValue);
			if (fileItem) existingFiles.push(fileItem);
		}

		setFiles(existingFiles);
		// Set form value to just keys (don't validate on initial load)
		setValue(name, multiple ? keys : keys[0] || null, { shouldValidate: false });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Only run once on mount

	/**
	 * Upload a single file to the server
	 */
	const uploadFile = useCallback(
		async (file: File): Promise<UploadResponse | null> => {
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
							isArray: multiple,
							path: directory,
							visibility,
							bucket, // Pass bucket adapter name
						}),
					},
					apiBaseUrl || '/kratosjs/api',
				);

				if (!response.ok) {
					const error = await response.json();
					throw new Error(`Upload failed: ${error.message || response.statusText}`);
				}

				return await response.json();
			} catch (error) {
				console.error('Upload error:', error);
				return null;
			}
		},
		[uploadEndpoint, name, multiple, directory, visibility],
	);

	/**
	 * Delete a file from bucket
	 */
	const deleteFromStorage = useCallback(
		async (payload: string | { key: string; bucket?: string }): Promise<boolean> => {
			if (!deleteEndpoint) return true;

			try {
				const body = typeof payload === 'string' ? { key: payload } : payload;
				const response = await authenticatedFetch(
					deleteEndpoint,
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(body),
					},
					apiBaseUrl || '/kratosjs/api',
				);
				return response.ok;
			} catch (error) {
				console.error('Delete error:', error);
				return false;
			}
		},
		[deleteEndpoint],
	);

	/**
	 * Update form value with current keys
	 * Backend will automatically detect deletions by comparing with existing record
	 */
	const updateFormValue = useCallback(
		(fileList: FileItem[]) => {
			// Get keys from uploaded/existing files
			const keys = fileList
				.filter(f => f.key && (f.status === 'uploaded' || f.status === 'existing'))
				.map(f => f.key!);

			// Set main field value - backend will detect deletions automatically
			// Trigger validation when value changes
			if (multiple) {
				setValue(name, keys.length > 0 ? keys : [], { shouldValidate: true });
			} else {
				setValue(name, keys[0] || null, { shouldValidate: true });
			}
		},
		[multiple, name, setValue],
	);

	/**
	 * Handle file drop/selection
	 */
	const onDrop = useCallback(
		async (acceptedFiles: File[], rejectedFiles: any[]) => {
			setErrors([]);

			// Handle rejected files
			const newErrors: string[] = [];
			rejectedFiles.forEach(({ file, errors: fileErrors }) => {
				fileErrors.forEach((error: any) => {
					switch (error.code) {
						case 'file-too-large':
							newErrors.push(`${file.name}: File is too large`);
							break;
						case 'file-too-small':
							newErrors.push(`${file.name}: File is too small`);
							break;
						case 'file-invalid-type':
							newErrors.push(`${file.name}: Invalid file type`);
							break;
						case 'too-many-files':
							newErrors.push(`Too many files. Maximum is ${maxFiles}`);
							break;
						default:
							newErrors.push(`${file.name}: ${error.message}`);
					}
				});
			});

			if (newErrors.length > 0) {
				setErrors(newErrors);
				return;
			}

			if (acceptedFiles.length === 0) return;

			// Create file items with pending status
			const newFileItems: FileItem[] = acceptedFiles.map(file => ({
				id: generateId(),
				file,
				blobUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
				status: 'pending' as const,
			}));

			// Handle single file replacement
			let updatedFiles: FileItem[];

			if (!multiple) {
				// Clean up existing file
				const existingFile = files[0];
				if (existingFile) {
					// Revoke blob URL
					if (existingFile.blobUrl) {
						URL.revokeObjectURL(existingFile.blobUrl);
					}

					if (existingFile.key && existingFile.status === 'uploaded') {
						// Delete immediately (not saved yet) - backend will handle existing files
						const deletePayload = existingFile.bucket
							? { key: existingFile.key, bucket: existingFile.bucket }
							: { key: existingFile.key };
						deleteFromStorage(deletePayload);
					}
					// Note: For existing files, backend will detect deletion automatically
				}
				updatedFiles = newFileItems;
			} else {
				updatedFiles = [...files, ...newFileItems];
			}

			// Update state with pending files
			setFiles(updatedFiles);

			// Upload files
			if (uploadEndpoint) {
				// Mark files as uploading
				setFiles(prev =>
					prev.map(f =>
						newFileItems.find(nf => nf.id === f.id) ? { ...f, status: 'uploading' as const } : f,
					),
				);

				// Upload all new files and collect results
				const uploadResults: { id: string; result: UploadResponse | null }[] = [];
				for (const fileItem of newFileItems) {
					const result = await uploadFile(fileItem.file!);
					uploadResults.push({ id: fileItem.id, result });
				}

				// Build the final file list
				const finalFiles: FileItem[] = [];

				// Start with existing/previously uploaded files (for multiple mode)
				if (multiple) {
					for (const f of updatedFiles) {
						// Keep files that aren't part of this upload batch
						if (!newFileItems.find(nf => nf.id === f.id)) {
							finalFiles.push(f);
						}
					}
				}

				// Add newly uploaded files with their results
				for (const fileItem of newFileItems) {
					const uploadResult = uploadResults.find(r => r.id === fileItem.id);

					if (uploadResult?.result?.data?.url && uploadResult?.result?.data?.key) {
						// Revoke blob URL since we have server URL now
						if (fileItem.blobUrl) {
							URL.revokeObjectURL(fileItem.blobUrl);
						}
						// Create new object explicitly to avoid any issues with spread
						// Extract bucket from formatted data if available
						const bucketName = bucket;
						finalFiles.push({
							id: fileItem.id,
							file: fileItem.file,
							key: uploadResult.result.data.key,
							bucket: bucketName,
							url: uploadResult.result.data.url,
							status: 'uploaded' as const,
						});
					} else {
						finalFiles.push({
							id: fileItem.id,
							file: fileItem.file,
							blobUrl: fileItem.blobUrl,
							status: 'error' as const,
							error: 'Upload failed',
						});
					}
				}

				// Update state and form value separately (not inside setFiles callback)
				setFiles(finalFiles);
				updateFormValue(finalFiles);
			} else {
				// No upload endpoint - just update state
				setFiles(updatedFiles);
			}
		},
		[files, multiple, maxFiles, uploadEndpoint, uploadFile, deleteFromStorage, updateFormValue],
	);

	/**
	 * Remove a file
	 * Backend will automatically detect deletions by comparing with existing record
	 */
	const removeFile = useCallback(
		async (fileId: string) => {
			const fileToRemove = files.find(f => f.id === fileId);
			if (!fileToRemove) return;

			// Revoke blob URL
			if (fileToRemove.blobUrl) {
				URL.revokeObjectURL(fileToRemove.blobUrl);
			}

			if (fileToRemove.key && fileToRemove.status === 'uploaded') {
				// Delete immediately (not saved to DB yet) - backend will handle existing files
				const deletePayload = fileToRemove.bucket
					? { key: fileToRemove.key, bucket: fileToRemove.bucket }
					: { key: fileToRemove.key };
				const deleted = await deleteFromStorage(deletePayload);
				if (!deleted) {
					setErrors(['Failed to delete file from bucket']);
					return;
				}
			}
			// Note: For existing files, backend will detect deletion automatically

			// Update files state
			const updatedFiles = files.filter(f => f.id !== fileId);
			setFiles(updatedFiles);

			// Update form value - backend will detect deletions
			updateFormValue(updatedFiles);
		},
		[files, deleteFromStorage, updateFormValue],
	);

	// Calculate upload limits
	const validFileCount = files.filter(f => f.status !== 'error').length;
	const maxAllowed = multiple ? maxFiles || Infinity : 1;
	const remainingSlots = Math.max(0, maxAllowed - validFileCount);
	const isAtLimit = remainingSlots <= 0;

	// Dropzone config
	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept:
			acceptedFileTypes.length > 0
				? acceptedFileTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {})
				: undefined,
		maxSize: maxSize ? maxSize * 1024 : undefined,
		minSize: minSize ? minSize * 1024 : undefined,
		multiple,
		maxFiles: remainingSlots,
		disabled: disabled || isAtLimit,
	});

	// Get display URL for a file
	const getDisplayUrl = (file: FileItem): string | undefined => file.url || file.blobUrl;

	// Get display name for a file
	const getDisplayName = (file: FileItem): string => {
		if (file.file?.name) return file.file.name;
		if (file.url) return file.url.split('/').pop() || 'File';
		if (file.key) return file.key.split('/').pop() || 'File';
		return 'File';
	};

	const openEditPreview = (url: string, type: ViewMediaType) => {
		setEditPreviewUrl(url);
		setEditPreviewType(type);
		setEditPreviewOpen(true);
	};

	return (
		<div className="space-y-2">
			{/* Label */}
			{label && (
				<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
					{label}
					{isRequired && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
				</label>
			)}

			{/* Helper text */}
			{helperText && <p className="text-sm text-gray-500 dark:text-gray-400">{helperText}</p>}

			{/* Hint */}
			<HintDisplay hint={hint} hintIcon={hintIcon} hintColor={hintColor} />

			{/* Dropzone */}
			{isAtLimit ? (
				<div className="border-2 border-dashed rounded-lg p-6 text-center border-border bg-gray-50 dark:bg-gray-800/50">
					<Check className="mx-auto h-12 w-12 text-green-500 dark:text-green-400" strokeWidth={1.5} />
					<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
						{multiple ? (
							<>
								Maximum of <span className="font-semibold">{maxFiles}</span> files reached
							</>
						) : (
							<>File uploaded</>
						)}
					</p>
					<p className="mt-1 text-xs text-gray-500">
						Remove {multiple ? 'a file' : 'the file'} to upload a new one
					</p>
				</div>
			) : (
				<div
					{...getRootProps()}
					className={`
						border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
						${isDragActive ? 'border-accent bg-accent-soft dark:bg-accent-soft' : 'border-border hover:border-gray-400'}
						${disabled ? 'opacity-50 cursor-not-allowed' : ''}
					`}>
					<input {...getInputProps()} />
					<Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
					<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
						{isDragActive ? (
							<span className="font-semibold text-accent">Drop files here</span>
						) : (
							<>
								<span className="font-semibold text-accent">Click to upload</span> or drag and drop
							</>
						)}
					</p>
					<p className="mt-1 text-xs text-gray-500">
						{acceptedFileTypes.length > 0 ? acceptedFileTypes.join(', ') : 'Any file type'}
						{maxSize && ` • Max ${maxSize}KB`}
						{multiple && maxFiles && ` • ${validFileCount}/${maxFiles} files`}
					</p>
				</div>
			)}

			{/* Errors */}
			{(errors.length > 0 || fieldError) && (
				<div className="space-y-1">
					{errors.map((error, index) => (
						<p key={index} className="text-sm text-red-600 dark:text-red-400">
							{error}
						</p>
					))}
					{fieldError && (
						<p className="text-sm text-red-600 dark:text-red-400">{fieldError.message as string}</p>
					)}
				</div>
			)}

			{/* File list */}
			{files.length > 0 && (
				<div className="space-y-2 mt-4">
					{files.map(file => {
						const displayUrl = getDisplayUrl(file);
						const displayName = getDisplayName(file);
						const isImage = (displayUrl && isImageUrl(displayUrl)) || file.file?.type?.startsWith('image/');
						const isVideo = (displayUrl && isVideoUrl(displayUrl)) || file.file?.type?.startsWith('video/');
						const isAudio = (displayUrl && isAudioUrl(displayUrl)) || file.file?.type?.startsWith('audio/');
						const isLoading = file.status === 'pending' || file.status === 'uploading';
						const hasError = file.status === 'error';

						return (
							<div
								key={file.id}
								className={`flex items-center justify-between p-3 bg-muted rounded-lg border border-border
									${isLoading ? 'opacity-60' : ''}
									${hasError ? 'border-red-500 dark:border-red-400' : ''}
								`}>
								<div className="flex items-center space-x-3 flex-1 min-w-0">
									{/* Thumbnail */}
									{displayUrl && (isImage || isVideo || isAudio) ? (
										<button
											type="button"
											onClick={() =>
												openEditPreview(
													displayUrl,
													isVideo ? 'video' : isAudio ? 'audio' : 'image',
												)
											}
											className="h-14 w-14 rounded overflow-hidden flex items-center justify-center bg-muted hover:opacity-80 transition-opacity">
											{isImage ? (
												<img
													src={displayUrl}
													alt={displayName}
													className="h-full w-full object-cover"
												/>
											) : isVideo ? (
												<div className="h-full w-full flex items-center justify-center bg-black text-white text-xs">
													<span className="px-1">Video</span>
												</div>
											) : (
												<div className="h-full w-full flex items-center justify-center bg-linear-to-r from-blue-600 to-purple-600 text-white text-xs">
													<span className="px-1">Audio</span>
												</div>
											)}
										</button>
									) : (
										<div className="h-10 w-10 bg-muted rounded flex items-center justify-center">
											<File className="h-6 w-6 text-gray-400 dark:text-gray-500" />
										</div>
									)}

									{/* File info */}
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
											{displayName}
										</p>
										{file.status === 'pending' && (
											<p className="text-xs text-gray-500 flex items-center gap-1">
												<Loader2 className="h-3 w-3 animate-spin" />
												Waiting...
											</p>
										)}
										{file.status === 'uploading' && (
											<p className="text-xs text-accent flex items-center gap-1">
												<Loader2 className="h-3 w-3 animate-spin" />
												Uploading...
											</p>
										)}
										{file.status === 'error' && (
											<p className="text-xs text-red-500 dark:text-red-400">
												{file.error || 'Error'}
											</p>
										)}
										{file.status === 'uploaded' && (
											<p className="text-xs text-green-500 dark:text-green-400">Uploaded</p>
										)}
										{file.status === 'existing' && (
											<p className="text-xs text-green-500 dark:text-green-400">Saved</p>
										)}
										{file.file && file.status !== 'error' && (
											<p className="text-xs text-gray-500 dark:text-gray-400">
												{formatFileSize(file.file.size)}
											</p>
										)}
									</div>
								</div>

								{/* Remove button */}
								<button
									type="button"
									onClick={() => removeFile(file.id)}
									className="ml-3 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 focus:outline-none"
									disabled={disabled || isLoading}>
									<Trash2 className="h-5 w-5" />
								</button>
							</div>
						);
					})}
				</div>
			)}

			{/* Edit mode media preview */}
			{editPreviewUrl && (
				<MediaPreviewModal
					isOpen={editPreviewOpen}
					onClose={() => setEditPreviewOpen(false)}
					mediaUrl={editPreviewUrl}
					mediaType={editPreviewType}
					title={typeof label === 'string' ? label : undefined}
					autoplay={editPreviewType === 'video' || editPreviewType === 'audio'}
					controls
				/>
			)}
		</div>
	);
}
