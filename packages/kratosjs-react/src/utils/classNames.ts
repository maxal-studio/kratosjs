import clsx, { ClassValue } from 'clsx';

/**
 * Utility function to combine class names
 * @param classes Class names to combine
 * @returns Combined class name string
 */
export function cn(...classes: ClassValue[]): string {
	return clsx(classes);
}
