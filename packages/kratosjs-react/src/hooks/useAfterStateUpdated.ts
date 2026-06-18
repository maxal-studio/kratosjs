import { useEffect, useRef } from 'react';
import { useWatch, useFormContext } from 'react-hook-form';
import { executeSerializedFunction } from '../runtime/serializedFunctions';

/**
 * Hook to execute afterStateUpdated callback when a field's value changes
 * @param fieldName - Name of the field to watch
 * @param callbackString - Serialized callback function as string
 */
export function useAfterStateUpdated(fieldName: string, callbackString?: string) {
	const { control, getValues, setValue } = useFormContext();
	const currentValue = useWatch({ control, name: fieldName });
	const previousValueRef = useRef<any>(currentValue);

	useEffect(() => {
		// Skip if no callback is provided
		if (!callbackString) return;

		// Skip on initial mount (when previousValue is undefined)
		if (previousValueRef.current === undefined && currentValue === undefined) {
			return;
		}

		// Check if value actually changed
		const hasChanged = previousValueRef.current !== currentValue;

		if (hasChanged) {
			try {
				// Create get function to access form values
				const get = (field: string) => {
					// Support dot notation for nested fields
					const keys = field.split('.');
					let value = getValues();

					for (const key of keys) {
						if (value === undefined || value === null) {
							return undefined;
						}
						value = value[key];
					}

					return value;
				};

				// Create set function to update form values
				const set = (field: string, value: any) => {
					setValue(field, value, {
						shouldValidate: true,
						shouldDirty: true,
						shouldTouch: true,
					});
				};

				// Evaluate the callback function using the shared utility
				// The function should be in the format: (get, set, state, old) => { ... }
				// Reconstruct the function first, then call it with the parameters
				const callback = executeSerializedFunction(callbackString);
				if (typeof callback === 'function') {
					// Call it with the required parameters
					callback(get, set, currentValue, previousValueRef.current);
				}
			} catch (error) {
				console.error('Error executing afterStateUpdated callback:', error);
			}
		}

		// Update previous value for next comparison
		previousValueRef.current = currentValue;
	}, [currentValue, callbackString, getValues, setValue]);
}
