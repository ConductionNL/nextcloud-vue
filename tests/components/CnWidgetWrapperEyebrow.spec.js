/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A widget card can carry a line above its title (widget-title-eyebrow):
 * board ShLiquiditeit's "Saldo per week" above "Prognose 13 weken".
 *
 * @spec openspec/changes/widget-title-eyebrow/specs/dashboard-page/spec.md#requirement-a-widget-card-can-carry-a-line-above-its-title
 */
import { mount } from '@vue/test-utils'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'
import CnWidgetWrapper from '../../src/components/CnWidgetWrapper/CnWidgetWrapper.vue'

import '../../src/components/CnWidgetGrid/registerDashboardWidgets.js'

const EYEBROW = '[data-testid="cn-widget-wrapper-eyebrow"]'

describe('CnWidgetWrapper eyebrow', () => {
	it('draws the eyebrow above the title, through the host translate', () => {
		const w = mount(CnWidgetWrapper, {
			props: { title: 'Forecast 13 weeks', eyebrow: 'Balance per week', showActions: false },
			global: { provide: { cnTranslate: (key) => ({ 'Balance per week': 'Saldo per week' })[key] || key } },
		})
		const stack = w.find('.cn-widget-wrapper__title-stack')
		expect(stack.exists()).toBe(true)
		expect(stack.find(EYEBROW).text()).toBe('Saldo per week')
		expect(stack.find('h3').text()).toBe('Forecast 13 weeks')
		expect(stack.element.firstElementChild.matches(EYEBROW)).toBe(true)
	})

	it('draws the title as before without one', () => {
		const w = mount(CnWidgetWrapper, { props: { title: 'Forecast', showActions: false } })
		expect(w.find(EYEBROW).exists()).toBe(false)
		expect(w.find('.cn-widget-wrapper__title-stack').exists()).toBe(false)
		expect(w.find('.cn-widget-wrapper__header-left > h3').text()).toBe('Forecast')
	})
})

describe('CnDashboardPage eyebrow', () => {
	it('passes a widget definition\'s eyebrow to its card', () => {
		const w = mount(CnDashboardPage, {
			props: {
				widgets: [{ id: 'forecast', type: 'text', title: 'Prognose 13 weken', eyebrow: 'Saldo per week', content: { text: 'x' } }, { id: 'plain', type: 'text', title: 'Plain', content: { text: 'y' } }],
				layout: [{ id: 1, widgetId: 'forecast', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 2 }],
			},
		})
		expect(w.vm.getWidgetEyebrow({ widgetId: 'forecast' })).toBe('Saldo per week')
		expect(w.vm.getWidgetEyebrow({ widgetId: 'plain' })).toBe('')
		expect(w.vm.kpiWrapperProps({ widgetId: 'forecast' }).eyebrow).toBe('Saldo per week')
	})
})
