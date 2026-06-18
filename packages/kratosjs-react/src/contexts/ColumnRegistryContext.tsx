import React from 'react';
import { createRegistryContext } from './createRegistryContext';
import { TextColumnComponent } from '../components/columns/TextColumnComponent';
import { IconColumnComponent } from '../components/columns/IconColumnComponent';
import { ImageColumnComponent } from '../components/columns/ImageColumnComponent';
import { VideoColumnComponent } from '../components/columns/VideoColumnComponent';
import { MediaColumnComponent } from '../components/columns/MediaColumnComponent';
import { ColorColumnComponent } from '../components/columns/ColorColumnComponent';
import { TagsColumnComponent } from '../components/columns/TagsColumnComponent';
import { ViewColumnComponent } from '../components/columns/ViewColumnComponent';
import { CheckboxColumnComponent } from '../components/columns/CheckboxColumnComponent';
import { ToggleColumnComponent } from '../components/columns/ToggleColumnComponent';
import { SelectColumnComponent } from '../components/columns/SelectColumnComponent';
import { TextInputColumnComponent } from '../components/columns/TextInputColumnComponent';

export type ColumnComponent = React.ComponentType<any>;

export type ColumnRegistry = Record<string, ColumnComponent>;

const defaultColumns: ColumnRegistry = {
	text: TextColumnComponent,
	icon: IconColumnComponent,
	image: ImageColumnComponent,
	video: VideoColumnComponent,
	media: MediaColumnComponent,
	color: ColorColumnComponent,
	tags: TagsColumnComponent,
	view: ViewColumnComponent,
	checkbox: CheckboxColumnComponent,
	toggle: ToggleColumnComponent,
	select: SelectColumnComponent,
	textinput: TextInputColumnComponent,
};

const registry = createRegistryContext<ColumnComponent>('ColumnRegistry', defaultColumns);

export const ColumnRegistryProvider = registry.Provider;
export const useColumnRegistry = registry.useRegistry;
