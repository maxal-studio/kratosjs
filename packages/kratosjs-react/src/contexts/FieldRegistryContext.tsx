import React from 'react';
import { FieldRegistry } from '../types';
import { createRegistryContext } from './createRegistryContext';
import { TextInputField } from '../components/TextInputField';
import { SelectField } from '../components/SelectField';
import { TextareaField } from '../components/TextareaField';
import { CheckboxField } from '../components/CheckboxField';
import { ToggleField } from '../components/ToggleField';
import { RadioField } from '../components/RadioField';
import { DateTimePickerField } from '../components/DateTimePickerField';
import { ColorPickerField } from '../components/ColorPickerField';
import { RepeaterField } from '../components/RepeaterField';
import { TagsInputField } from '../components/TagsInputField';
import { HiddenField } from '../components/HiddenField';
import { FileUploadField } from '../components/FileUploadField';
import { RichEditorField } from '../components/RichEditorField';
import { SectionField } from '../components/SectionField';
import { GroupField } from '../components/GroupField';
import { TabsField } from '../components/TabsField';

const defaultFields: FieldRegistry = {
	'text-input': TextInputField,
	select: SelectField,
	textarea: TextareaField,
	checkbox: CheckboxField,
	toggle: ToggleField,
	radio: RadioField,
	'date-time-picker': DateTimePickerField,
	'color-picker': ColorPickerField,
	repeater: RepeaterField,
	'tags-input': TagsInputField,
	hidden: HiddenField,
	fileUpload: FileUploadField,
	richEditor: RichEditorField,
	section: SectionField,
	group: GroupField,
	tabs: TabsField,
};

const registry = createRegistryContext('FieldRegistry', defaultFields);

export const FieldRegistryContext = registry.Context;
export const useFieldRegistry = registry.useRegistry;

export interface FieldRegistryProviderProps {
	customFields?: FieldRegistry;
	children: React.ReactNode;
}

/**
 * Provider component that manages the field registry.
 * Custom field components (e.g. from plugins) override the built-ins.
 */
export function FieldRegistryProvider({ customFields = {}, children }: FieldRegistryProviderProps) {
	return <registry.Provider registry={customFields}>{children}</registry.Provider>;
}
