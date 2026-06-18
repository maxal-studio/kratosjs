import React from 'react';
import * as LucideIcons from 'lucide-react';

export type IconName = string;

export interface IconProps {
	name: IconName;
	size?: number | string;
	color?: string;
	className?: string;
	strokeWidth?: number;
}

/**
 * Icon component that renders Lucide icons
 *
 * @example
 * <Icon name="Check" size={24} color="green" />
 * <Icon name="X" className="text-red-500" />
 *
 * @see https://lucide.dev/icons for available icon names
 */
export const Icon: React.FC<IconProps> = ({ name, size = 24, color, className = '', strokeWidth = 2 }) => {
	const IconComponent = (LucideIcons as any)[name] as React.ComponentType<LucideIcons.LucideProps>;

	if (!IconComponent) {
		console.warn(`Icon "${name}" not found in Lucide icons`);
		return null;
	}

	return <IconComponent size={size} color={color} className={className} strokeWidth={strokeWidth} />;
};

// Re-export all Lucide icons for direct use
export * from 'lucide-react';
export { LucideIcons };
