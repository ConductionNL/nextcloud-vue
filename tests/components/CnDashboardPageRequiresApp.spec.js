/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Audit F4 (7 October 2026): the "Install shillinq" placeholder used
 * NcEmptyContent, whose 64px icon, 20px name, description and button do not
 * fit a two-row tile. The icon ran out at the top and the button at the
 * bottom. The placeholder is now two lines of text and the button.
 */

jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

import { mount } from '@vue/test-utils'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'
import { registerDashboardWidget } from '@/components/CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('test-requires-app', { renderer: { template: '<div class="rend" />' }, form: {}, defaultContent: {}, displayName: 'R', icon: 'X' })

const stubs = {
	CnDashboardGrid: { template: '<div><div v-for="it in layout" :key="it.id"><slot name="widget" :item="it" /></div></div>', props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'] },
	CnWidgetWrapper: { props: ['showTitle', 'title'], template: '<div class="ww"><slot /></div>' },
	NcButton: { props: ['href'], template: '<a class="button-vue" :href="href"><slot /></a>' },
	NcLoadingIcon: { template: '<div />' },
}

function mountMissing() {
	return mount(CnDashboardPage, {
		propsData: {
			widgets: [{ id: 'w', type: 'test-requires-app', title: 'Invoices', requiresApp: 'shillinq' }],
			layout: [{ id: '1', widgetId: 'w', gridX: 0, gridY: 0, gridWidth: 3, gridHeight: 2 }],
			appStatuses: { shillinq: { installed: false, enabled: false } },
		},
		stubs,
	})
}

describe('CnDashboardPage requires-app placeholder', () => {
	it('renders the compact text and install button, with no empty-content icon or name', () => {
		const w = mountMissing()
		const box = w.find('[data-testid="cn-requires-app"]')
		expect(box.exists()).toBe(true)
		expect(box.classes()).toContain('cn-requires-app--compact')
		expect(box.find('.cn-requires-app__description').text()).toContain('isn\'t installed yet')
		expect(box.find('.button-vue').text()).toContain('Install shillinq')
		expect(box.find('.empty-content__icon').exists()).toBe(false)
		expect(box.find('.empty-content__name').exists()).toBe(false)
		expect(w.find('.rend').exists()).toBe(false)
	})

	it('keeps to two lines of text and centres without clipping the top', () => {
		const css = readFileSync(resolve(__dirname, '../../src/css/dashboard.css'), 'utf8')
		const block = (selector) => {
			const i = css.indexOf(selector + ' {')
			return i === -1 ? '' : css.slice(i, css.indexOf('}', i))
		}
		expect(block('.cn-requires-app--compact')).toMatch(/justify-content: safe center;/)
		expect(block('.cn-requires-app--compact')).toMatch(/overflow: auto;/)
		expect(block('.cn-requires-app--compact .cn-requires-app__description')).toMatch(/-webkit-line-clamp: 2;/)
		expect(block('.cn-requires-app.cn-requires-app .empty-content__icon svg')).toMatch(/max-height: 32px !important;/)
	})
})
