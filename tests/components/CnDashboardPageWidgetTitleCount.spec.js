/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * `{count}` in a dashboard widget title is the total the widget reports
 * (DqMijnWerk "Mijn 14 zaken per stap"); such a card draws no count chip.
 *
 * @spec openspec/changes/widget-title-count/specs/widget-title-count/spec.md#requirement-a-widget-title-can-carry-the-total-its-widget-reports
 */
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'

const stubs = {
	CnDashboardGrid: { template: '<div><div v-for="it in layout" :key="it.id"><slot name="widget" :item="it" /></div></div>', props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'] },
	CnWidgetWrapper: { props: ['widgetId', 'title'], template: '<div class="ww" :data-id="widgetId"><h3 class="ww-title">{{ title }}</h3><div class="ww-meta"><slot name="title-meta" /></div><slot /></div>' },
	NcButton: { template: '<button><slot /></button>' },
	NcEmptyContent: { template: '<div />' },
	NcLoadingIcon: { template: '<div />' },
}

const Reporting = {
	name: 'Reporting',
	props: ['content'],
	emits: ['header'],
	mounted() {
		if (this.content.count !== undefined) {
			this.$emit('header', { link: null, note: '', count: this.content.count })
		}
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

const card = (w, id) => w.findAll('.ww').find((el) => el.attributes('data-id') === id)

describe('CnDashboardPage: {count} in a widget title', () => {
	it('fills the reported total into the title and draws no chip', async () => {
		const w = mountPage([{ id: 'steps', type: 'reporting', title: 'My {count} cases per step', content: { count: 14 } }])
		await nextTick()
		await nextTick()
		expect(card(w, 'steps').find('.ww-title').text()).toBe('My 14 cases per step')
		expect(card(w, 'steps').find('[data-testid="cn-dashboard-widget-header-count"]').exists()).toBe(false)
	})

	it('reads the token as nothing until a total arrives', async () => {
		const w = mountPage([{ id: 'steps', type: 'reporting', title: 'My {count} cases per step', content: {} }])
		await nextTick()
		expect(card(w, 'steps').find('.ww-title').text()).toBe('My cases per step')
	})

	it('keeps the chip for a title without the token', async () => {
		const w = mountPage([{ id: 'list', type: 'reporting', title: 'Actiepunten', content: { count: 2 } }])
		await nextTick()
		await nextTick()
		expect(card(w, 'list').find('[data-testid="cn-dashboard-widget-header-count"]').text()).toBe('2')
	})
})
