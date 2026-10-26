/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaakHistorie's checkboxes and entries: in the board look a history
 * checkbox is a plain box with 14px text 8px after it (r31: a 34px padded
 * row, 15px/500), and an entry's message comes before its head in the markup
 * (r31 read the head first: 13px muted).
 *
 * @spec openspec/changes/board-history-toggles-and-entries/specs/timeline/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const vue = fs.readFileSync(path.join(__dirname, '../../src/components/CnTimelineWidget/CnTimelineManage.vue'), 'utf8')

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

const C = '.cn-look-board .cn-timeline-manage .checkbox-radio-switch.checkbox-radio-switch'

describe('the board history checkboxes and entries', () => {
	it('draws a checkbox as a plain box with 14px text', () => {
		expect(rule(C + ' .checkbox-content:not(.cn-look-nextcloud *)')).toContain('min-height: 0')
		expect(rule(C + ' .checkbox-content__text:not(.cn-look-nextcloud *)')).toContain('font-size: 14px')
	})

	it('puts the message before the head in the markup', () => {
		const entry = vue.slice(vue.indexOf('class="cn-timeline-manage__entry"'))
		expect(entry.indexOf('cn-timeline-manage__message')).toBeLessThan(entry.indexOf('cn-timeline-manage__head'))
	})
})
