import { mount } from '@vue/test-utils'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `metaBeside: true` sets a row's meta line on the title's line, as the
 * boards draw a one-line summary (DqTermijnen "Totale dwangsom in 2026:
 * € 1.442,00   1 betaling, geen betwist").
 *
 * @spec openspec/changes/record-list-meta-beside/specs/record-list-meta-beside/spec.md
 */
import fs from 'fs'
import path from 'path'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of a rule in the component's styles.
 *
 * @param {string} selector The exact selector.
 * @return {string} Its body, or '' when there is no such rule.
 */
function rule(selector) {
	const at = source.indexOf(selector + ' {')
	return at === -1 ? '' : source.slice(at, source.indexOf('}', at))
}

describe('CnRecordListWidget: metaBeside', () => {
	it('marks the list', () => {
		const wrapper = mount(CnRecordListWidget, { propsData: { content: { items: [{ id: 1, title: 'Totaal', meta: 'een' }], title: '{title}', meta: '{meta}', metaBeside: true } } })
		expect(wrapper.find('.cn-record-list').classes()).toContain('cn-record-list--meta-beside')
	})

	it('leaves a list without it alone', () => {
		const wrapper = mount(CnRecordListWidget, { propsData: { content: { items: [{ id: 1, title: 'Totaal' }], title: '{title}' } } })
		expect(wrapper.find('.cn-record-list').classes()).not.toContain('cn-record-list--meta-beside')
	})

	it('lays the title and the meta line out on one baseline, 14px apart', () => {
		const main = rule('.cn-record-list--meta-beside .cn-record-list__main')
		expect(main).toContain('flex-direction: row;')
		expect(main).toContain('align-items: baseline;')
		expect(main).toContain('gap: 6px 14px;')
		expect(rule('.cn-record-list--meta-beside .cn-record-list__meta')).toContain('font-size: 14px;')
	})

	it('keeps the 14px meta over the board dashboard\'s 13px', () => {
		const board = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
		const selector = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-record-list--meta-beside .cn-record-list__meta'
		const at = board.indexOf(selector + ' {')
		expect(at).toBeGreaterThan(board.indexOf('.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-record-list__meta {'))
		expect(board.slice(at, board.indexOf('}', at))).toContain('font-size: 14px;')
	})
})
