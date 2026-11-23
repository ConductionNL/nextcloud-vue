/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The buildiq square: one square in the page header under the board look,
 * directly before the primary header button, and none in the actions bar.
 * Without the look it stays in the actions bar.
 *
 * @spec openspec/changes/screens-chrome-parity/specs/layout-components/spec.md#requirement-the-buildiq-square-is-one-square-everywhere
 */
import { mount } from '@vue/test-utils'
import CnActionsBar from '../../src/components/CnActionsBar/CnActionsBar.vue'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import CnSettingsPage from '../../src/components/CnSettingsPage/CnSettingsPage.vue'

const Square = { name: 'CnBuildiqEditButton', template: '<div class="square" data-testid="square" />' }
const BarStub = {
	name: 'CnActionsBar',
	props: ['showBuildiqButton'],
	template: '<div class="bar"><div v-if="showBuildiqButton" class="square bar-square" /></div>',
}

function mountIndex(look, extra = {}) {
	return mount(CnIndexPage, {
		propsData: {
			title: 'All cases',
			schema: { title: 'Case', properties: {} },
			objects: [],
			showTitle: true,
			headerButtons: [{ label: 'Download', action: 'export' }, { label: 'Actions', action: 'refresh' }, { action: 'add', variant: 'primary', label: 'New case' }],
			...extra,
		},
		global: {
			provide: look ? { cnLook: look } : {},
			mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'Cases' } },
			stubs: {
				CnActionsBar: BarStub,
				CnBuildiqEditButton: Square,
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

describe('the buildiq square on an index page', () => {
	it('reads Download, Actions, the square, New case under the board look, with none in the bar', () => {
		const w = mountIndex('board')
		const row = w.find('[data-testid="cn-index-header-buttons"]')
		const kids = row.element.children
		const labels = Array.from(kids).map((el) => (el.classList.contains('square') ? 'square' : el.textContent.trim()))
		expect(labels).toEqual(['Download', 'Actions', 'square', 'New case'])
		expect(w.find('.bar-square').exists()).toBe(false)
	})

	it('puts the square last when no header button is primary', () => {
		const w = mountIndex('board', { headerButtons: [{ label: 'Download', action: 'export' }] })
		const kids = Array.from(w.find('[data-testid="cn-index-header-buttons"]').element.children)
		expect(kids[kids.length - 1].classList.contains('square')).toBe(true)
	})

	it('keeps the square in the actions bar without the look', () => {
		const w = mountIndex(null)
		expect(w.find('[data-testid="cn-index-header-buttons"] .square').exists()).toBe(false)
		expect(w.find('.bar-square').exists()).toBe(true)
	})

	it('keeps the square in the bar when the title is hidden', () => {
		const w = mountIndex('board', { showTitle: false })
		expect(w.find('.bar-square').exists()).toBe(true)
	})
})

describe('CnActionsBar', () => {
	it('draws the square by default and not with showBuildiqButton: false', () => {
		const stubs = { CnBuildiqEditButton: Square }
		const on = mount(CnActionsBar, { global: { stubs } })
		expect(on.find('.square').exists()).toBe(true)
		const off = mount(CnActionsBar, { propsData: { showBuildiqButton: false }, global: { stubs } })
		expect(off.find('.square').exists()).toBe(false)
	})
})

describe('the buildiq square on a settings page', () => {
	it('sits in the header under the board look and is absent without it', () => {
		const stubs = { CnBuildiqEditButton: Square }
		const board = mount(CnSettingsPage, { propsData: { title: 'Settings', showTitle: true, look: 'board' }, global: { stubs } })
		expect(board.find('.cn-settings-page__header-buttons .square').exists()).toBe(true)
		const plain = mount(CnSettingsPage, { propsData: { title: 'Settings', showTitle: true }, global: { stubs } })
		expect(plain.find('.square').exists()).toBe(false)
	})
})

describe('the buildiq colour', () => {
	it('reads --cn-buildiq-color with the brand orange as the default', () => {
		const fs = require('fs')
		const path = require('path')
		const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnBuildiqEditButton/CnBuildiqEditButton.vue'), 'utf8')
		expect(sfc).toContain('var(--cn-buildiq-color, var(--c-orange-knvb, #f36c21))')
	})
})
