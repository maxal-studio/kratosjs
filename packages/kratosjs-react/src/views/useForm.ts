import { useCallback, useRef, useState } from 'react';
import { router, type VisitOptions } from './router';

export interface UseFormReturn<T extends Record<string, unknown>> {
	data: T;
	setData: {
		(values: Partial<T>): void;
		<K extends keyof T>(key: K, value: T[K]): void;
	};
	errors: Record<string, string>;
	setError(key: string, message: string): void;
	clearErrors(): void;
	processing: boolean;
	reset(): void;
	submit(method: string, url: string, options?: VisitOptions): Promise<void>;
	get(url: string, options?: VisitOptions): Promise<void>;
	post(url: string, options?: VisitOptions): Promise<void>;
	put(url: string, options?: VisitOptions): Promise<void>;
	patch(url: string, options?: VisitOptions): Promise<void>;
	delete(url: string, options?: VisitOptions): Promise<void>;
}

/**
 * Minimal form helper for Views. Holds form state, submits through the router,
 * and captures the server's `{ field: message }` validation bag into `errors`.
 *
 * ```tsx
 * const form = useForm({ title: '' });
 * form.post('/posts');
 * ```
 */
export function useForm<T extends Record<string, unknown>>(initial: T): UseFormReturn<T> {
	const initialRef = useRef(initial);
	const [data, setDataState] = useState<T>(initial);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [processing, setProcessing] = useState(false);

	const setData = useCallback(
		((keyOrValues: any, value?: any) => {
			if (typeof keyOrValues === 'string') {
				setDataState(prev => ({ ...prev, [keyOrValues]: value }));
			} else {
				setDataState(prev => ({ ...prev, ...keyOrValues }));
			}
		}) as UseFormReturn<T>['setData'],
		[],
	);

	const submit = useCallback(
		async (method: string, url: string, options: VisitOptions = {}) => {
			setProcessing(true);
			setErrors({});
			try {
				await router.request(method, url, {
					...options,
					data: options.data ?? (data as Record<string, unknown>),
					onError: bag => {
						setErrors(bag);
						options.onError?.(bag);
					},
				});
			} finally {
				setProcessing(false);
			}
		},
		[data],
	);

	return {
		data,
		setData,
		errors,
		setError: (key, message) => setErrors(prev => ({ ...prev, [key]: message })),
		clearErrors: () => setErrors({}),
		processing,
		reset: () => setDataState(initialRef.current),
		submit,
		get: (url, options) => submit('GET', url, options),
		post: (url, options) => submit('POST', url, options),
		put: (url, options) => submit('PUT', url, options),
		patch: (url, options) => submit('PATCH', url, options),
		delete: (url, options) => submit('DELETE', url, options),
	};
}
