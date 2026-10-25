/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `content.compact: true` draws the stacked bar as the board's summary box
 * (DqZaakDocumenten "4 van 7 beoordeeld").
 *
 * @spec openspec/changes/stacked-bar-compact/specs/stacked-bar-compact/spec.md
 */
import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnStackedBarWidget from '../../src/components/CnStackedBarWidget/CnStackedBarWidget.vue'

const SEGMENTS = [{ key: 'a', label: 'Openbaar', value: 2 }, { key: 'b', label: 'Deels openbaar', value: 1 }]
const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnStackedBarWidget/CnStackedBarWidget.vue'), 'utf8')
const style = source.slice(source.indexOf('<style'))

function rule(selector) {
	const at = style.indexOf(selector + ' {')
	return at === -1 ? '' : style.slice(at, style.indexOf('}', at))
}

describe('CnStackedBarWidget compact', () => {
	it('marks the widget compact only when asked', () => {
		const compact = mount(CnStackedBarWidget, { propsData: { content: { segments: SEGMENTS, compact: true } } })
		expect(compact.find('[data-testid="cn-stacked-bar"]').classes()).toContain('cn-stacked-bar--compact')
		const plain = mount(CnStackedBarWidget, { propsData: { content: { segments: SEGMENTS } } })
		expect(plain.find('[data-testid="cn-stacked-bar"]').classes()).not.toContain('cn-stacked-bar--compact')
	})

	it('is the summary box: sunken ground, thin joined bar, inline legend', () => {
		expect(rule('.cn-stacked-bar--compact')).toMatch(/padding:\s*14px 16px/)
		expect(rule('.cn-stacked-bar--compact .cn-stacked-bar__bar')).toMatch(/height:\s*8px/)
		expect(rule('.cn-stacked-bar--compact .cn-stacked-bar__bar')).toMatch(/gap:\s*0/)
		expect(rule('.cn-stacked-bar--compact .cn-stacked-bar__legend')).toMatch(/display:\s*flex/)
		expect(rule('.cn-stacked-bar--compact .cn-stacked-bar__legend-item')).toMatch(/flex-direction:\s*row/)
		expect(rule('.cn-stacked-bar--compact .cn-stacked-bar__count')).toMatch(/font-size:\s*1em/)
	})
})
