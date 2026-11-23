/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A sections widget on a dashboard groups chart widgets as a card of cards
 * (DqDoorlooptijd "Naleving"): the page hands it its widget definitions, so
 * each section finds the widget it names, and the cards sit in columns.
 *
 * @spec openspec/changes/sections-card-grid/specs/sections-card-grid/spec.md#requirement-a-sections-widget-can-lay-its-cards-out-in-columns
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'
import CnSectionsWidget from '../../src/components/CnSectionsWidget/CnSectionsWidget.vue'

import '../../src/components/CnWidgetGrid/registerDashboardWidgets.js'

const WIDGETS = [
	{
		id: 'compliance',
		type: 'sections',
		title: 'Compliance',
		content: {
			cards: true,
			columns: 3,
			footnote: 'Click a case type to see its cases.',
			sections: [
				{ title: 'By case type', widgetId: 'by-type' },
				{ title: 'Distribution', widgetId: 'distribution' },
				{ title: 'Trend', widgetId: 'trend' },
				{ title: 'Throughput', widgetId: 'throughput' },
			],
		},
	},
	...['by-type', 'distribution', 'trend', 'throughput'].map((id) => ({ id, type: 'chart', title: id, content: { chartKind: 'bar' } })),
]

const HostStub = { name: 'CnDetailWidgetHost', props: ['widget'], template: '<div class="host-stub">{{ widget && widget.id }}</div>' }

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

describe('CnDashboardPage: a sections widget as a card of cards', () => {
	it('renders every section\'s widget in a three-column grid with the footnote', async () => {
		const w = mount(CnDashboardPage, {
			props: { widgets: WIDGETS, layout: [{ id: 1, widgetId: 'compliance', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 6 }] },
			global: { stubs: { CnDetailWidgetHost: HostStub, CnDashboardGrid: { props: ['layout'], template: '<div><template v-for="item in layout" :key="item.id"><slot name="widget" :item="item" /></template></div>' } } },
		})
		await flush()
		const sections = w.findComponent(CnSectionsWidget)
		expect(sections.exists()).toBe(true)
		expect(sections.classes()).toContain('cn-sections-widget--grid')
		expect(w.findAll('.host-stub').map((h) => h.text())).toEqual(['by-type', 'distribution', 'trend', 'throughput'])
		expect(sections.find('[data-testid="cn-sections-widget-footnote"]').text()).toBe('Click a case type to see its cases.')
	})
})
