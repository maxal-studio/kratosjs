/**
 * Icon types for IconColumn
 *
 * @see https://lucide.dev/icons for available icon names
 */

export type IconName = string; // Any Lucide icon name (e.g., 'Check', 'X', 'Edit')
export type IconColor = string; // Any Tailwind color class or hex color

export type IconCallback = (value: any, row: Record<string, any>) => IconName;
export type ColorCallback = (value: any, row: Record<string, any>) => IconColor;
