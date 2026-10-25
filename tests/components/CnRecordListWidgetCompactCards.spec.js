/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `density: "compact"` on cards draws the boards' small framed rows
 * (DqInspectie r29: title 15px/700 on 18px, 15px in and 13px down, live
 * 600 on 22.5, 19 in and 19 down).
 */
import fs from 'fs'
import path from 'path'

const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'), 'utf8')

/**
 * @param {string} selector The selector as written.
 * @return {string} The rule body, or ''.
 */
function rule(selector) {
	const at = sfc.indexOf(selector + ' {')
	return at === -1 ? '' : sfc.slice(at, sfc.indexOf('}', at))
}

describe('CnRecordListWidget compact cards', () => {
	it('pads a compact card 12px 14px with 6px between its lines', () => {
		const card = rule('.cn-record-list--compact .cn-record-list__card')
		expect(card).toContain('padding: 12px 14px')
		expect(card).toContain('gap: 6px')
	})

	it('sets the title 15px/700 on a 1.2 line, the pill at its first line', () => {
		const title = rule('.cn-record-list--compact .cn-record-list__card .cn-record-list__title')
		expect(title).toContain('font-weight: 700')
		expect(title).toContain('line-height: 1.2')
		expect(rule('.cn-record-list--compact .cn-record-list__card-head')).toContain('align-items: flex-start')
	})
})
