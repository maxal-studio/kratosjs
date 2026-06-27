import React, { useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { FormRendererProps } from './types';
import { FieldRenderer } from './FieldRenderer';
import { cn } from './utils/classNames';
import { getGridClasses } from './components/utils/layoutHelpers';
import { Button } from './components/ui/Button';
import { SerializedComponent } from '@maxal_studio/kratosjs';
import { getChildComponents, isArrayScope, isLayout } from './runtime/formTraversal';
import { useTranslation } from './i18n/useTranslation';
import { Slot } from './slots/Slot';

/**
 * Extract default values from a schema using the declarative children contract.
 * Layout containers are transparent (recurse into children); array-scope
 * containers (repeaters) seed their own array value from the item template; leaf
 * fields contribute their `default`.
 */
function extractDefaultValues(components: SerializedComponent[]): Record<string, any> {
	const defaults: Record<string, any> = {};

	components.forEach(component => {
		// Array-scope container (Repeater): seed the array value, never leak item fields.
		if (isArrayScope(component)) {
			if (!component.name) return;
			const template = getChildComponents(component);

			if (component.default !== undefined && Array.isArray(component.default)) {
				defaults[component.name] = component.default;
				return;
			}

			const count =
				typeof component.defaultItems === 'number' && component.defaultItems > 0
					? component.defaultItems
					: typeof (component as any).minItems === 'number' && (component as any).minItems > 0
						? ((component as any).minItems as number)
						: 0;

			if (count > 0 && template.length > 0) {
				const itemDefaults = extractDefaultValues(template);
				defaults[component.name] = Array.from({ length: count }, () => ({ ...itemDefaults }));
			}
			return;
		}

		// Layout container: transparent, recurse into children.
		if (isLayout(component)) {
			Object.assign(defaults, extractDefaultValues(getChildComponents(component)));
			return;
		}

		// Leaf field with a default value.
		if (component.name && component.default !== undefined) {
			defaults[component.name] = component.default;
		}
	});

	return defaults;
}

/**
 * FormRenderer component
 * Main component that accepts JSON schema and renders the form
 */
export function FormRenderer({
	schema,
	onSubmit,
	defaultValues = {},
	className,
	apiBaseUrl,
	resource,
	operation,
	children,
}: FormRendererProps) {
	const { t } = useTranslation();
	// Extract default values from schema and merge with user-provided defaults
	const mergedDefaults = useMemo(() => {
		const schemaDefaults = extractDefaultValues(schema.components);
		return { ...schemaDefaults, ...defaultValues };
	}, [schema.components, defaultValues]);

	const methods = useForm({
		defaultValues: mergedDefaults,
		mode: 'onChange', // Validate and re-validate on change
	});

	const handleSubmit = async (data: any) => {
		try {
			await onSubmit(data);
		} catch (error) {
			console.error('Form submission error:', error);
		}
	};

	// Calculate grid classes based on the columns prop (static class maps — purge-safe)
	const formGridClasses =
		!schema.columns || schema.columns === 1 ? 'space-y-6' : `${getGridClasses(schema.columns)} gap-y-4`;

	return (
		<FormProvider {...methods}>
			{children}
			<form onSubmit={methods.handleSubmit(handleSubmit)} className={cn(className)} noValidate>
				<Slot
					name="form.header"
					context={{ resourceSlug: resource, record: defaultValues, schema }}
					as="div"
					className="mb-4 space-y-3 empty:hidden"
				/>
				<div className={formGridClasses}>
					{schema.components.map((field, index) => (
						<FieldRenderer
							key={field.name || index}
							field={field}
							apiBaseUrl={apiBaseUrl}
							resource={resource}
							operation={operation}
							mode="edit"
						/>
					))}
				</div>

				<div className="flex flex-wrap items-center justify-end gap-3 pt-6">
					<Slot
						name="form.footer"
						context={{ resourceSlug: resource, record: defaultValues, schema }}
						as="div"
						className="mr-auto flex flex-wrap items-center gap-2 empty:hidden"
					/>
					<Button variant="secondary" onClick={() => methods.reset()}>
						{t('core:common.reset')}
					</Button>
					<Button type="submit" loading={methods.formState.isSubmitting}>
						{methods.formState.isSubmitting ? t('core:common.submitting') : t('core:common.submit')}
					</Button>
				</div>
			</form>
		</FormProvider>
	);
}
