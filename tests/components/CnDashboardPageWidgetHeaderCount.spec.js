/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A dashboard card draws the total its widget reports (`count`, record-list
 * `headerCount`) as a chip after the title (screens-record-list-row-action).
 *
 * @spec openspec/changes/screens-record-list-row-action/specs/record-list/spec.md
 */
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'

const stubs = {
	CnDashboardGrid: { template: '<div><div v-for="it in layout" :key="it.id"><slot name="widget" :item="it" /></div></div>', props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'] },
	CnWidgetWrapper: { props: ['widgetId'], template: '<div class="ww" :data-id="widgetId"><div class="ww-meta"><slot name="title-meta" /></div><slot /></div>' },
	NcButton: { template: '<button><slot /></button>' },
	NcEmptyContent: { template: '<div />' },
	NcLoadingIcon: { template: '<div />' },
}

const Reporting = {
	name: 'Reporting',
	props: ['content'],
	emits: ['header'],
	mounted() {
		this.$emit('header', { link: null, note: '', ...(this.content.count !== undefined ? { count: this.content.count } : {}) })
	},
	template: '<div class="reporting" />',
}

function mountPage(widgets) {
	return mount(CnDashboardPage, {
		propsData: {
			widgets,
			layout: widgets.map((d, i) => ({ id: String(i), widgetId: d.id, gridX: 0, gridY: i * 4, gridWidth: 6, gridHeight: 4 })),
		},
		global: { stubs, provide: { cnRegistry: { reporting: Reporting } } },
	})
}

const chipOf = (w, id) => w.findAll('.ww').find((el) => el.attributes('data-id') === id).find('[data-testid="cn-dashboard-widget-header-count"]')

describe('CnDashboardPage: a reported count', () => {
	it('is a chip after the title, 0 included', async () => {
		const w = mountPage([
			{ id: 'a', type: 'reporting', title: 'Voorstellen om te beoordelen', content: { count: 2 } },
			{ id: 'b', type: 'reporting', title: 'Stemmingen voor u', content: { count: 0 } },
		])
		await nextTick()
		await nextTick()
		expect(chipOf(w, 'a').text()).toBe('2')
		expect(chipOf(w, 'b').text()).toBe('0')
	})

	it('draws nothing when the widget reports no count', async () => {
		const w = mountPage([{ id: 'a', type: 'reporting', title: 'Actiepunten', content: {} }])
		await nextTick()
		await nextTick()
		expect(chipOf(w, 'a').exists()).toBe(false)
	})
})
