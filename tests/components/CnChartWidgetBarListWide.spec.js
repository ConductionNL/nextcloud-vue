/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `barListWide`: the boards' wide share list, a 220px label column, a 90px
 * value column, 12px bars 12px apart, right under the card header
 * (DqTermijnen "Op tijd beslist per zaaktype"). The default bar list
 * (DqDashboard "Zaken per status") is untouched.
 *
 * @spec openspec/changes/chart-bar-list-wide/specs/chart-bar-list-wide/spec.md
 */
import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnChartWidget from '../../src/components/CnChartWidget/CnChartWidget.vue'

const props = { type: 'bar-list', categories: ['Woo-verzoek', 'Bezwaar'], series: [{ name: '%', data: [100, 50] }] }
const strip = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '')
const widget = strip(fs.readFileSync(path.join(__dirname, '../../src/components/CnChartWidget/CnChartWidget.vue'), 'utf8'))
const board = strip(fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8'))

/**
 * The declarations of a rule.
 *
 * @param {string} css The stylesheet text.
 * @param {string} selector The exact selector.
 * @return {string} Its body, or '' when there is no such rule.
 */
function rule(css, selector) {
	const at = css.indexOf(selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('CnChartWidget bar-list: wide', () => {
	it('marks the list when asked', () => {
		const wrapper = mount(CnChartWidget, { props: { ...props, barListWide: true } })
		expect(wrapper.find('.cn-chart-widget__bar-list').classes()).toContain('cn-chart-widget__bar-list--wide')
	})

	it('leaves the default bar list alone', () => {
		const wrapper = mount(CnChartWidget, { props })
		expect(wrapper.find('.cn-chart-widget__bar-list').classes()).not.toContain('cn-chart-widget__bar-list--wide')
	})

	it('draws 220px labels, 90px values and 12px bars 12px apart', () => {
		expect(rule(widget, '.cn-chart-widget__bar-list--wide')).toContain('gap: 12px;')
		expect(rule(widget, '.cn-chart-widget__bar-list--wide .cn-chart-widget__bar-line')).toContain('grid-template-columns: 220px minmax(0, 1fr) 90px;')
		const track = rule(widget, '.cn-chart-widget__bar-list--wide .cn-chart-widget__bar-track')
		expect(track).toContain('height: 12px;')
		expect(track).toContain('border-radius: 6px;')
	})

	it('starts right under a subtitled board dashboard card header', () => {
		const selector = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-widget-wrapper:not(.cn-widget-wrapper--borderless):has(.cn-widget-wrapper__subtitle) .cn-chart-widget__html:has(> .cn-chart-widget__bar-list--wide)'
		expect(rule(board, selector)).toContain('padding-top: 0;')
	})

	it('is a dashboard chart option', () => {
		const page = fs.readFileSync(path.join(__dirname, '../../src/components/CnDashboardPage/CnDashboardPage.vue'), 'utf8')
		expect(page).toMatch(/'barListWide',/)
	})
})
