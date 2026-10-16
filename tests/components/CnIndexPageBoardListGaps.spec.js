/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The list boards (PqContacten, PqOrganisaties, PqLeads, DqZaken) under the
 * board look: a labelled Download button keeps its icon, the view switch draws
 * its four segments without the manifest listing them, and rows read alike
 * unless the page offers the Unread lens. The Nextcloud look is unchanged.
 *
 * @spec openspec/changes/screens-index-board-gaps/specs/index-list-board-look/spec.md
 */
import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import CnDataTable from '../../src/components/CnDataTable/CnDataTable.vue'

function mountPage(props = {}, look = 'board') {
	return mount(CnIndexPage, {
		props: {
			title: 'Contacts',
			schema: { title: 'Contact', properties: {} },
			objects: [],
			showTitle: true,
			...props,
		},
		global: {
			provide: { cnLook: look },
			mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'Contacts' } },
			stubs: {
				CnActionsBar: true,
				CnSavedViewsControl: true,
				CnBuildiqEditButton: true,
				CnDataTable: true,
				CnCardGrid: true,
				CnPagination: true,
				CnContextMenu: true,
				CnRowActions: true,
				CnIndexSidebar: true,
			},
		},
	})
}

function exportButton(w) {
	return w.vm.resolvedHeaderButtons.find((b) => b.action === 'export')
}

describe('CnIndexPage board list: the Download button', () => {
	it('keeps the download icon on a labelled export button', () => {
		const w = mountPage({ headerButtons: [{ action: 'export', label: 'Download' }] })
		expect(exportButton(w).label).toBe('Download')
		expect(exportButton(w).icon).toBe('Download')
	})

	it('keeps an icon the manifest names', () => {
		const w = mountPage({ headerButtons: [{ action: 'export', label: 'Download', icon: 'FileExport' }] })
		expect(exportButton(w).icon).toBe('FileExport')
	})

	it('adds no icon under the Nextcloud look', () => {
		const w = mountPage({ headerButtons: [{ action: 'export', label: 'Download' }] }, 'nextcloud')
		expect(exportButton(w).icon).toBe('')
	})
})

describe('CnIndexPage board list: the view switch', () => {
	it('draws the four board segments without a viewSwitch key', () => {
		const w = mountPage()
		expect(w.vm.effectiveToggleModes).toEqual(expect.arrayContaining(['table', 'cards']))
		expect(w.vm.viewSwitchDisabledModes).toEqual(['board', 'map'])
	})

	it('follows a viewSwitch the manifest names', () => {
		const w = mountPage({ viewSwitch: ['table', 'cards'] })
		expect(w.vm.viewSwitchDisabledModes).toEqual([])
	})

	it('adds no segments under the Nextcloud look', () => {
		expect(mountPage({}, 'nextcloud').vm.viewSwitchDisabledModes).toEqual([])
	})
})

describe('CnIndexPage board list: unread rows', () => {
	it('does not mark unread rows under the board look', () => {
		expect(mountPage().vm.showUnreadRows).toBe(false)
	})

	it('marks them on a page that offers the Unread lens', () => {
		expect(mountPage({ personalLenses: ['unread'] }).vm.showUnreadRows).toBe(true)
	})

	it('marks them under the Nextcloud look', () => {
		expect(mountPage({}, 'nextcloud').vm.showUnreadRows).toBe(true)
	})
})

describe('CnDataTable: showUnread', () => {
	const rows = [{ id: '1', name: 'Joke Smit', '@self': { unread: true } }]
	function mountTable(props = {}) {
		return mount(CnDataTable, {
			props: { rows, columns: [{ key: 'name', label: 'Name' }], rowKey: 'id', ...props },
			global: { stubs: { CnCellRenderer: { props: ['value'], template: '<span>{{ value }}</span>' } } },
		})
	}

	it('marks an unread row by default', () => {
		const w = mountTable()
		expect(w.find('[data-testid="cn-object-row"]').classes()).toContain('cn-table-row--unread')
		expect(w.find('[data-testid="cn-unread-marker"]').exists()).toBe(true)
	})

	it('draws it like any row when off', () => {
		const w = mountTable({ showUnread: false })
		expect(w.find('[data-testid="cn-object-row"]').classes()).not.toContain('cn-table-row--unread')
		expect(w.find('[data-testid="cn-unread-marker"]').exists()).toBe(false)
	})
})

describe('board look: the header funnel', () => {
	const fs = require('fs')
	const path = require('path')
	const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

	it('draws the funnel as the board\'s 22px button 4px after the chevron', () => {
		const match = css.match(/\.cn-look-board \.cn-table-container--board \.cn-data-table th \.cn-table-header__filter\s*\{([^}]*)\}/)
		expect(match).not.toBeNull()
		expect(match[1]).toMatch(/width:\s*22px/)
		expect(match[1]).toMatch(/height:\s*22px/)
		expect(match[1]).toMatch(/margin-inline-start:\s*4px/)
	})
})

describe('board look: the table header row', () => {
	const fs = require('fs')
	const path = require('path')
	const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

	it('is near-white, a token over a light mix, not the hover grey', () => {
		const match = css.match(/\.cn-look-board \.cn-table-container--board \.cn-data-table th\s*\{([^}]*)\}/)
		expect(match).not.toBeNull()
		expect(match[1]).toMatch(/background:\s*var\(--cn-board-table-head-bg,\s*color-mix\(/)
	})
})
