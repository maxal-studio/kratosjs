import React from 'react';
import { SerializedRelation } from '../../../types';
import { Icon } from '../../utils/Icon';
import { cn } from '../../../utils/classNames';
import { pillTabClass } from '../../ui/PillButton';
import { translate } from '../../../i18n/activeLocale';

export interface RelationGroup {
	key: string;
	label: string;
	icon?: string;
	relations: SerializedRelation[];
}

export interface GroupedRelations {
	groups: RelationGroup[];
	ungrouped: SerializedRelation[];
}

/** Group relations by groupKey; ungrouped relations become individual tabs. */
export function groupRelations(relations: SerializedRelation[]): GroupedRelations {
	const groups: Record<string, RelationGroup> = {};
	const ungrouped: SerializedRelation[] = [];

	for (const rel of relations) {
		if (rel.groupKey) {
			const groupKey = `group_${rel.groupKey}`;
			if (!groups[groupKey]) {
				groups[groupKey] = {
					key: groupKey,
					label: rel.groupLabel || rel.groupKey,
					icon: rel.groupIcon || rel.icon,
					relations: [],
				};
			}
			groups[groupKey].relations.push(rel);
		} else {
			ungrouped.push(rel);
		}
	}

	return { groups: Object.values(groups), ungrouped };
}

function TabButton({
	active,
	onClick,
	icon,
	children,
}: {
	active: boolean;
	onClick: () => void;
	icon?: string;
	children: React.ReactNode;
}) {
	return (
		<button type="button" role="tab" aria-selected={active} onClick={onClick} className={pillTabClass(active)}>
			{icon && <Icon name={icon as any} className="h-4 w-4 shrink-0" />}
			<span>{children}</span>
		</button>
	);
}

export interface RelationTabsProps {
	grouped: GroupedRelations;
	activeTopTab: string;
	onTopTabChange: (key: string) => void;
	/** Whether the action bar is rendered above (affects sticky offset) */
	hasActionBar: boolean;
}

/**
 * Top tab strip of the view modal — pill tabs matching table/sidebar design.
 */
export function RelationTabs({ grouped, activeTopTab, onTopTabChange, hasActionBar }: RelationTabsProps) {
	return (
		<div
			className={cn(
				'sticky z-40 shrink-0 border-b border-border/60 bg-surface px-4 py-3',
				hasActionBar ? 'top-[60px]' : 'top-0',
			)}>
			<div
				className="flex gap-1 overflow-x-auto overscroll-x-contain"
				style={{ WebkitOverflowScrolling: 'touch' }}
				role="tablist"
				aria-label={translate('core:modal.sections')}>
				<TabButton active={activeTopTab === 'details'} onClick={() => onTopTabChange('details')}>
					{translate('core:common.details')}
				</TabButton>
				{grouped.groups.map(group => (
					<TabButton
						key={group.key}
						active={activeTopTab === group.key}
						onClick={() => onTopTabChange(group.key)}
						icon={group.icon}>
						{group.label}
					</TabButton>
				))}
				{grouped.ungrouped.map(rel => (
					<TabButton
						key={rel.name}
						active={activeTopTab === rel.name}
						onClick={() => onTopTabChange(rel.name)}
						icon={rel.icon}>
						{rel.pluralLabel}
					</TabButton>
				))}
			</div>
		</div>
	);
}

export interface GroupInnerTabsProps {
	group: RelationGroup;
	current: string;
	onChange: (relationName: string) => void;
}

/** Inner tab strip inside a relation group. */
export function GroupInnerTabs({ group, current, onChange }: GroupInnerTabsProps) {
	return (
		<div className="mb-4 overflow-x-auto">
			<div
				className="flex gap-1 overflow-x-auto overscroll-x-contain"
				style={{ WebkitOverflowScrolling: 'touch' }}
				role="tablist"
				aria-label={`${group.label} relations`}>
				{group.relations.map(rel => (
					<TabButton
						key={rel.name}
						active={current === rel.name}
						onClick={() => onChange(rel.name)}
						icon={rel.icon}>
						{rel.pluralLabel}
					</TabButton>
				))}
			</div>
		</div>
	);
}
