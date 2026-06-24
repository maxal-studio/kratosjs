import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { translate } from '../../i18n/activeLocale';

export interface ConfirmOptions {
	title?: string;
	message: React.ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	/** Style the confirm button as destructive */
	danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface PendingConfirm extends ConfirmOptions {
	resolve: (confirmed: boolean) => void;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
	const [pending, setPending] = useState<PendingConfirm | null>(null);
	const confirmButtonRef = useRef<HTMLButtonElement>(null);

	const confirm = useCallback<ConfirmFn>(options => {
		return new Promise<boolean>(resolve => {
			setPending({ ...options, resolve });
		});
	}, []);

	const settle = useCallback(
		(confirmed: boolean) => {
			pending?.resolve(confirmed);
			setPending(null);
		},
		[pending],
	);

	// Focus the confirm button and support Escape to cancel
	useEffect(() => {
		if (!pending) return;
		confirmButtonRef.current?.focus();
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') settle(false);
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [pending, settle]);

	return (
		<ConfirmContext.Provider value={confirm}>
			{children}
			{pending && (
				<div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-black/50" onClick={() => settle(false)} aria-hidden="true" />
					<div
						role="alertdialog"
						aria-modal="true"
						aria-label={pending.title || translate('core:common.confirm')}
						className="relative w-full max-w-md rounded-lg border border-border bg-raised p-6 shadow-soft-lg">
						<div className="flex items-start gap-4">
							<div
								className={
									pending.danger
										? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger'
										: 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent'
								}>
								<AlertTriangle className="h-5 w-5" />
							</div>
							<div className="min-w-0 flex-1">
								<h3 className="text-base font-semibold text-fg">
									{pending.title || translate('core:confirm.are_you_sure')}
								</h3>
								<div className="mt-1.5 text-sm text-fg-secondary">{pending.message}</div>
							</div>
						</div>
						<div className="mt-6 flex justify-end gap-2">
							<Button variant="secondary" onClick={() => settle(false)}>
								{pending.cancelLabel || translate('core:common.cancel')}
							</Button>
							<Button
								ref={confirmButtonRef}
								variant={pending.danger ? 'danger' : 'primary'}
								onClick={() => settle(true)}>
								{pending.confirmLabel || translate('core:common.confirm')}
							</Button>
						</div>
					</div>
				</div>
			)}
		</ConfirmContext.Provider>
	);
}

/**
 * Promise-based confirmation dialog. Outside a ConfirmProvider it falls
 * back to the native window.confirm so callers always get an answer.
 */
export function useConfirm(): ConfirmFn {
	const context = useContext(ConfirmContext);
	return (
		context ??
		(async (options: ConfirmOptions) =>
			window.confirm(
				typeof options.message === 'string'
					? options.message
					: options.title || translate('core:confirm.are_you_sure'),
			))
	);
}
