import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FieldProps } from '../types';

export function HiddenField({ name, default: defaultValue, mode }: FieldProps) {
	// Hidden fields should not be displayed in view mode
	if (mode === 'view') {
		return null;
	}

	const { register } = useFormContext();

	return <input type="hidden" {...register(name)} defaultValue={defaultValue} />;
}
