/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * PtMededelingenActies: a list in a tab hands its Actions menu (Import, Export,
 * Copy selected, Delete selected) to the tab strip's menu, beside the tabs, and
 * draws none of its own. Outside a tab it keeps its own menu.
 *
 * @spec openspec/changes/notice-list-in-a-tab/specs/index-list-widget/spec.md#requirement-a-list-in-a-tab-hands-its-actions-menu-to-the-tab-strip
 */
const { mount } = require('@vue/test-utils')
const { nextTick } = require('vue')

const runs = []
jest.mock('../../src/components/CnIndexPage/CnIndexPage.vue', () => ({
	__esModule: true,
	default: {
		name: 'CnIndexPage',
		props: ['register', 'schema', 'filter', 'title', 'showTitle', 'routeState', 'buildiqButton', 'showActionsMenu', 'showMassImport', 'showMassExport', 'showMassCopy', 'showMassDelete'],
		data: () => ({ selected: 0 }),
		methods: {
			headerMenuEntries(button) {
				return button.items.map((name) => ({ key: name, label: name, icon: 'X', disabled: name.endsWith('selected') && this.selected === 0, run: () => runs.push(name) }))
			},
		},
		template: '<div class="index-stub" />',
	},
}))

const CnIndexListWidget = require('../../src/components/CnIndexListWidget/CnIndexListWidget.vue').default
const { PANEL_ACTION_SINK } = require('../../src/utils/panelActions.js')

const CONTENT = { register: 'portaliq', schema: 'portalNotice', filter: { portal: '@object.slug' } }

function mountIn(sink, content = CONTENT) {
	return mount(CnIndexListWidget, {
		props: { content, objectId: 'p1', objectData: { slug: 'zuiddrecht' } },
		global: { provide: sink ? { [PANEL_ACTION_SINK]: sink } : {} },
	})
}

describe('CnIndexListWidget in a tab panel', () => {
	it('publishes the list\'s menu entries to the strip and draws no menu of its own', async () => {
		const published = []
		const wrapper = mountIn({ set: (items) => published.push(items), clear: jest.fn() })
		await nextTick()
		expect(wrapper.findComponent({ name: 'CnIndexPage' }).props('showActionsMenu')).toBe(false)
		const items = published[published.length - 1]
		expect(items.map((i) => i.key)).toEqual(['import', 'export', 'copy-selected', 'delete-selected'])
		expect(items[2].disabled).toBe(true)
		items[0].run()
		expect(runs).toContain('import')
	})

	it('leaves out what the list turns off', async () => {
		const published = []
		mountIn({ set: (items) => published.push(items), clear: jest.fn() }, { ...CONTENT, showMassImport: false, showMassCopy: false })
		await nextTick()
		expect(published[published.length - 1].map((i) => i.key)).toEqual(['export', 'delete-selected'])
	})

	it('clears its entries when it goes', async () => {
		const clear = jest.fn()
		const wrapper = mountIn({ set: jest.fn(), clear })
		await nextTick()
		wrapper.unmount()
		expect(clear).toHaveBeenCalled()
	})

	it('keeps its own menu outside a tab panel', async () => {
		const wrapper = mountIn(null)
		await nextTick()
		expect(wrapper.findComponent({ name: 'CnIndexPage' }).props('showActionsMenu')).toBeUndefined()
	})
})
