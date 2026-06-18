import React from 'react';
import { cn } from '../../utils/classNames';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
	required?: boolean;
}

export function Label({ required, className, children, ...rest }: LabelProps) {
	return (
		<label className={cn('block text-sm font-medium text-fg', className)} {...rest}>
			{children}
			{required && <span className="ml-0.5 text-danger">*</span>}
		</label>
	);
}
