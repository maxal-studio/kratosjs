import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../../utils/classNames';
import { translate } from '../../i18n/activeLocale';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastOptions {
	variant?: ToastVariant;
	/** Auto-dismiss delay in ms (default 4000; 0 disables) */
	duration?: number;
}

interface ToastItem {
	id: number;
	message: React.ReactNode;
	variant: ToastVariant;
}

export interface ToastApi {
	toast: (message: React.ReactNode, options?: ToastOptions) => void;
	success: (message: React.ReactNode) => void;
	error: (message: React.ReactNode) => void;
	info: (message: React.ReactNode) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const VARIANT_STYLES: Record<ToastVariant, { icon: React.ReactNode; bar: string }> = {
	success: { icon: <CheckCircle2 className="h-5 w-5 text-success" />, bar: 'bg-success' },
	error: { icon: <AlertCircle className="h-5 w-5 text-danger" />, bar: 'bg-danger' },
	info: { icon: <Info className="h-5 w-5 text-accent" />, bar: 'bg-accent' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
	const [toasts, setToasts] = useState<ToastItem[]>([]);
	const idRef = useRef(0);

	const dismiss = useCallback((id: number) => {
		setToasts(prev => prev.filter(t => t.id !== id));
	}, []);

	const toast = useCallback(
		(message: React.ReactNode, options?: ToastOptions) => {
			const id = ++idRef.current;
			const variant = options?.variant ?? 'info';
			setToasts(prev => [...prev, { id, message, variant }]);
			const duration = options?.duration ?? 4000;
			if (duration > 0) {
				setTimeout(() => dismiss(id), duration);
			}
		},
		[dismiss],
	);

	const api = useMemo<ToastApi>(
		() => ({
			toast,
			success: message => toast(message, { variant: 'success' }),
			error: message => toast(message, { variant: 'error', duration: 6000 }),
			info: message => toast(message, { variant: 'info' }),
		}),
		[toast],
	);

	return (
		<ToastContext.Provider value={api}>
			{children}
			{toasts.length > 0 && (
				<div className="fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
					{toasts.map(t => (
						<div
							key={t.id}
							role="status"
							className="relative flex items-start gap-3 overflow-hidden rounded-lg border border-border bg-raised p-4 pr-10 shadow-soft-lg">
							<span className={cn('absolute inset-y-0 left-0 w-1', VARIANT_STYLES[t.variant].bar)} />
							<span className="shrink-0">{VARIANT_STYLES[t.variant].icon}</span>
							<div className="min-w-0 flex-1 break-words text-sm text-fg">{t.message}</div>
							<button
								type="button"
								onClick={() => dismiss(t.id)}
								aria-label={translate('core:common.dismiss')}
								className="absolute right-2 top-2 rounded-md p-1 text-fg-muted transition-colors hover:bg-hover hover:text-fg">
								<X className="h-4 w-4" />
							</button>
						</div>
					))}
				</div>
			)}
		</ToastContext.Provider>
	);
}

/**
 * Toast API. Outside a ToastProvider (e.g. standalone FormRenderer usage)
 * it degrades to console logging instead of crashing.
 */
export function useToast(): ToastApi {
	const context = useContext(ToastContext);
	return useMemo(() => {
		if (context) return context;
		const fallback = (message: React.ReactNode) => console.info('[kratosjs toast]', message);
		return { toast: fallback, success: fallback, error: fallback, info: fallback };
	}, [context]);
}
