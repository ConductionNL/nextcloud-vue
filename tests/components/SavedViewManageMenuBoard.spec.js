/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A saved view's manage menu as DqFilterBeheren and DqFilterInMenu draw it:
 * Save a copy on an own view, a separator before Delete, the refresh icon on
 * Update with current filters, and a pin before a view that is in the menu.
 *
 * @spec openspec/changes/board-saved-view-manage-menu/specs/board-saved-view-manage-menu/spec.md
 */
const { mount } = require('@vue/test-utils')
const CnSavedViewsPanel = require('../../src/components/CnSavedViewsPanel/CnSavedViewsPanel.vue').default

const own = { id: 1, name: 'Termijn deze week', owner: 'alice', '@self': { access: 'owner' } }
const other = { id: 2, name: 'Wacht op inwoner', owner: 'alice', '@self': { access: 'owner' } }

function mountPanel(look, props = {}) {
	return mount(CnSavedViewsPanel, {
		props: { views: [own, other], currentUserId: 'alice', menuIds: ['1'], ...props },
		global: { provide: { cnLook: look } },
	})
}

describe('CnSavedViewsPanel manage menu', () => {
	it('offers the owner Save a copy', () => {
		const w = mountPanel('board')
		expect(w.findAll('[data-testid="cn-saved-views-copy"][data-view-id="1"]')).toHaveLength(1)
	})

	it('puts a separator before Delete', () => {
		const w = mountPanel('board')
		const kids = w.findAllComponents({ name: 'NcActions' })[0].vm.$slots.default()
			.flatMap((n) => (Array.isArray(n.children) ? n.children : [n]))
			.filter((n) => n && n.type && typeof n.type === 'object')
			.map((n) => n.type.name)
		const del = kids.lastIndexOf('NcActionButton')
		expect(kids[del - 1]).toBe('NcActionSeparator')
	})

	it('draws the refresh icon on Update with current filters', () => {
		const w = mountPanel('board')
		const update = w.get('[data-testid="cn-saved-views-update"][data-view-id="1"]')
		expect(update.find('.refresh-icon').exists()).toBe(true)
	})
})

describe('CnSavedViewsPanel in-menu marker', () => {
	it('draws a pin before a view that is in the menu, in the board look only', () => {
		const board = mountPanel('board')
		expect(board.findAll('[data-testid="cn-saved-views-in-menu"]')).toHaveLength(1)
		expect(board.get('[data-testid="cn-saved-views-item"][data-view-id="1"]').find('[data-testid="cn-saved-views-in-menu"]').exists()).toBe(true)
		expect(mountPanel('nextcloud').findAll('[data-testid="cn-saved-views-in-menu"]')).toHaveLength(0)
	})

	it('says the view is in the menu in its accessible name', () => {
		const w = mountPanel('nextcloud')
		expect(w.get('[data-testid="cn-saved-views-item"][data-view-id="1"]').attributes('aria-label')).toBe('Termijn deze week, in the menu')
		expect(w.get('[data-testid="cn-saved-views-item"][data-view-id="2"]').attributes('aria-label')).toBe('Wacht op inwoner')
	})
})
