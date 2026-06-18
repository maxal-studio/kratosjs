import React from 'react';
import { cn } from '../../utils/classNames';
import { PillButton, PillIconButton } from '../../components/ui/PillButton';

export type TableToolbarButtonProps = React.ComponentProps<typeof PillButton>;
export type TableToolbarIconButtonProps = React.ComponentProps<typeof PillIconButton>;

export function TableToolbarButton(props: TableToolbarButtonProps) {
	return <PillButton {...props} />;
}

export function TableToolbarIconButton({ className, ...props }: TableToolbarIconButtonProps) {
	return <PillIconButton className={cn('text-fg-secondary hover:text-fg', className)} {...props} />;
}
