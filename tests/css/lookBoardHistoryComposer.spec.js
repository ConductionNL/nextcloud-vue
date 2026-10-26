/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The history card's note composer and entries in the board look, as
 * DqZaakHistorie draws them (r31 strict verdict: note field 70 vs 89.5, add
 * button 34 vs 40, title-row buttons 8 vs 12 apart, the requester pill grey
 * at 13px). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-history-composer/specs/timeline/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

const T = '.cn-look-board .cn-timeline-manage'

describe('look-board-detail.css: the history composer and entries', () => {
	it('makes the note field three lines high', () => {
		expect(rule(T + ' .cn-timeline-manage__draft:not(.cn-look-nextcloud *)')).toContain('min-height: calc(3 * 1.5em + 22px)')
	})

	it('sets the add button at the board height and the title-row buttons 12px apart', () => {
		expect(rule(T + ' .cn-timeline-manage__composer-foot .button-vue:where(:not(.cn-look-nextcloud *))')).toContain('--button-size: var(--cn-board-control-height)')
		expect(rule(T + ' .cn-timeline-manage__header-actions:not(.cn-look-nextcloud *)')).toContain('gap: 12px')
	})

	it('marks an entry the requester sees with a 12px pill', () => {
		const body = rule(T + ' .cn-timeline-manage__badge--public:not(.cn-look-nextcloud *)')
		expect(body).toContain('font-size: 12px')
		expect(body).toContain('font-weight: 600')
	})
})
