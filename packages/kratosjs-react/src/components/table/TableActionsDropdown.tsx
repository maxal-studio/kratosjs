import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { SerializedTable } from '@maxal_studio/kratosjs';
import { Icon } from '../utils/Icon';
import { cn } from '../../utils/classNames';

interface TableActionsDropdownProps {
	schema: SerializedTable;
	rowId: any;
	rowIndex: number;
	totalRows: number;
	isOpen: boolean;
	onToggle: () => void;
	onAction: (actionName: string, rowId: any) => void;
}

export function TableActionsDropdown({
	schema,
	rowId,
	rowIndex,
	totalRows,
	isOpen,
	onToggle,
	onAction,
}: TableActionsDropdownProps) {
	if (!schema.actions || schema.actions.length === 0) {
		return null;
	}

	const buttonRef = useRef<HTMLButtonElement>(null);
	const [dropdownPosition, setDropdownPosition] = useState<{
		top: number;
		right: number;
		opensUpward: boolean;
	} | null>(null);
	const opensUpward = rowIndex >= totalRows - 3;

	useEffect(() => {
		if (isOpen && buttonRef.current) {
			const rect = buttonRef.current.getBoundingClientRect();
			if (opensUpward) {
				setDropdownPosition({
					top: rect.top - 4,
					right: window.innerWidth - rect.right,
					opensUpward: true,
				});
			} else {
				setDropdownPosition({
					top: rect.bottom + 4,
					right: window.innerWidth - rect.right,
					opensUpward: false,
				});
			}
		} else {
			setDropdownPosition(null);
		}
	}, [isOpen, opensUpward]);

	return (
		<div className="relative inline-block">
			<button
				ref={buttonRef}
				onClick={onToggle}
				className={cn(
					'inline-flex h-8 w-8 items-center justify-center rounded-full bg-raised text-fg-secondary transition-colors',
					'hover:bg-hover hover:text-fg',
					isOpen && 'bg-raised text-fg shadow-soft-sm ring-1 ring-border',
				)}
				title="Actions"
				aria-label="Row actions"
				aria-expanded={isOpen}>
				<Icon name="MoreVertical" size={16} />
			</button>

			{isOpen &&
				createPortal(
					<>
						<div className="fixed inset-0" style={{ zIndex: 40 }} onClick={onToggle} />

						{dropdownPosition && (
							<div
								className="fixed w-48 overflow-hidden rounded-xl border border-border bg-raised shadow-soft-lg"
								style={{
									zIndex: 60,
									top: `${dropdownPosition.top}px`,
									right: `${dropdownPosition.right}px`,
									transform: dropdownPosition.opensUpward ? 'translateY(-100%)' : 'none',
								}}>
								<div className="py-1">
									{schema.actions.map(action => (
										<button
											key={action.name}
											onClick={() => {
												onToggle();
												onAction(action.name, rowId);
											}}
											className={cn(
												'flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-hover/70',
												action.color || 'text-fg',
											)}>
											{action.icon && <Icon name={action.icon} size={16} />}
											<span>{action.label || action.name}</span>
										</button>
									))}
								</div>
							</div>
						)}
					</>,
					document.body,
				)}
		</div>
	);
}
