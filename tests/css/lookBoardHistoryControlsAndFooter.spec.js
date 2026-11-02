/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaakHistorie draws the visibility select 8px under the kind chips and the
 * first entry 60px under the chips' foot, the footer 16px under the last
 * entry on one 20px line with the audit trail as a link. Live put 74px
 * between chips and list (12 + NcSelect's 6/4 margin + 12) and a 34px button
 * in a 36px footer row, so the card stood 23px taller (r44).
 *
 * @spec openspec/changes/board-history-controls-and-footer/specs/timeline/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('the board history controls and footer', () => {
	it('puts the select 8px under the chips without NcSelect margin, the list 12px under it', () => {
		expect(rule('.cn-look-board .cn-timeline-manage__chips:not(.cn-look-nextcloud *)')).toContain('margin-block-end: 8px')
		expect(rule('.cn-look-board .cn-timeline-manage__controls .v-select.select:not(.cn-look-nextcloud *)')).toContain('margin: 0')
	})

	it('starts the footer 16px under the last entry', () => {
		expect(rule('.cn-look-board .cn-timeline-manage .cn-timeline-manage__footer:not(.cn-look-nextcloud *)')).toContain('margin-block-start: 16px')
	})

	it('draws the footer on one 20px line: the checkbox box without its top margin, the audit trail as a 20px link', () => {
		expect(rule('.cn-look-board .cn-timeline-manage__footer .checkbox-content__icon:not(.cn-look-nextcloud *)')).toContain('margin-block-start: 0')
		const link = rule('.cn-look-board .cn-timeline-manage__footer .cn-timeline-manage__audit-link.button-vue:not(.cn-look-nextcloud *)')
		expect(link).toContain('min-height: 20px')
		expect(link).toContain('height: 20px')
		expect(link).toContain('padding: 0')
	})
})
