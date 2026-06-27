import { describe, expect, it } from 'vitest';
import { SLOT_NAMES } from './types';

describe('SLOT_NAMES', () => {
	it('maps camelCase keys to dotted slot names with unique values', () => {
		const values = Object.values(SLOT_NAMES);
		expect(new Set(values).size).toBe(values.length);
		expect(values.every(v => /^[a-z]+\.[A-Za-z]+$/.test(v))).toBe(true);
	});

	it('includes the additional slots', () => {
		expect(SLOT_NAMES.sidebarBrand).toBe('sidebar.brand');
		expect(SLOT_NAMES.tableBulkActions).toBe('table.bulkActions');
		expect(SLOT_NAMES.tableRowActions).toBe('table.rowActions');
		expect(SLOT_NAMES.detailTabs).toBe('detail.tabs');
		expect(SLOT_NAMES.widgetsAppend).toBe('widgets.append');
		expect(SLOT_NAMES.modalHeaderActions).toBe('modal.headerActions');
		expect(SLOT_NAMES.modalFooter).toBe('modal.footer');
		expect(SLOT_NAMES.loginTop).toBe('login.top');
	});
});
