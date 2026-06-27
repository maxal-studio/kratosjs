import type { ReactNode, ComponentType } from 'react';

/**
 * Built-in slot ids — the named injection points the framework renders in the
 * panel chrome. Plugins may also use arbitrary strings to declare their own
 * slots inside components they render.
 */
export type BuiltInSlotName =
	| 'header.left'
	| 'header.right'
	| 'header.userMenu'
	| 'sidebar.brand'
	| 'sidebar.top'
	| 'sidebar.bottom'
	| 'panel.footer'
	| 'table.toolbar'
	| 'table.aboveTable'
	| 'table.belowTable'
	| 'table.bulkActions'
	| 'table.rowActions'
	| 'form.header'
	| 'form.footer'
	| 'detail.actions'
	| 'detail.tabs'
	| 'detail.afterDetails'
	| 'page.top'
	| 'page.bottom'
	| 'widgets.append'
	| 'modal.headerActions'
	| 'modal.footer'
	| 'login.top'
	| 'login.belowForm';

/**
 * A slot name. The built-in names give autocomplete; the `string & {}` arm keeps
 * the union open so plugins can define and target their own slots.
 */
export type SlotName = BuiltInSlotName | (string & {});

/**
 * Context passed to every slot render. The base shape is always present; each
 * placement widens it with the data it can supply (e.g. the current record for
 * detail/form slots, the resource slug for table slots).
 */
export interface SlotContext {
	/** The slot being rendered. */
	slot: SlotName;
	/** Slug of the resource in scope, when the slot sits inside a resource view. */
	resourceSlug?: string;
	/** Resource/page schema in scope, when available. */
	schema?: unknown;
	/** The record in scope, for detail/form slots. */
	record?: Record<string, unknown>;
	/** Current router pathname. */
	location?: string;
	/** Authenticated user, for header/userMenu slots. Cast to your `AuthUser`. */
	user?: unknown;
	/** Slot-specific extras (e.g. `{ selectedIds }` for `table.bulkActions`, `{ rowId }` for `table.rowActions`). */
	data?: Record<string, unknown>;
}

/**
 * A slot's renderable: either a React component that receives the slot context
 * as props, or a plain function of the context returning a node.
 */
export type SlotRender<C extends SlotContext = SlotContext> = ComponentType<C> | ((ctx: C) => ReactNode);

/**
 * A single contribution to a slot. Multiple contributions stack into one slot,
 * unlike the override-based component registries.
 */
export interface SlotContribution<C extends SlotContext = SlotContext> {
	/** Stable id — used as the React key and to dedupe across contributors. */
	id: string;
	/** Component or function that produces the slot content. */
	render: SlotRender<C>;
	/** Lower renders first. Defaults to 0; ties keep registration order. */
	order?: number;
}

/**
 * What a plugin/app contributes: a single contribution or an array per slot.
 * Authored on `KratosPluginClient.slots` and `mountAdminPanel({ slots })`.
 */
export type SlotMap = Partial<Record<SlotName, SlotContribution | SlotContribution[]>>;

/** Internal resolved form: every slot maps to a sorted array of contributions. */
export type ResolvedSlots = Record<string, SlotContribution[]>;

/**
 * Built-in slot names as a const object, for autocomplete and refactor-safe
 * references without losing the open `SlotName` string union.
 */
export const SLOT_NAMES = {
	headerLeft: 'header.left',
	headerRight: 'header.right',
	headerUserMenu: 'header.userMenu',
	sidebarBrand: 'sidebar.brand',
	sidebarTop: 'sidebar.top',
	sidebarBottom: 'sidebar.bottom',
	panelFooter: 'panel.footer',
	tableToolbar: 'table.toolbar',
	tableAboveTable: 'table.aboveTable',
	tableBelowTable: 'table.belowTable',
	tableBulkActions: 'table.bulkActions',
	tableRowActions: 'table.rowActions',
	formHeader: 'form.header',
	formFooter: 'form.footer',
	detailActions: 'detail.actions',
	detailTabs: 'detail.tabs',
	detailAfterDetails: 'detail.afterDetails',
	pageTop: 'page.top',
	pageBottom: 'page.bottom',
	widgetsAppend: 'widgets.append',
	modalHeaderActions: 'modal.headerActions',
	modalFooter: 'modal.footer',
	loginTop: 'login.top',
	loginBelowForm: 'login.belowForm',
} as const satisfies Record<string, BuiltInSlotName>;
