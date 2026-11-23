/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The history card in the board look, as DqZaakHistorie draws it: the kind
 * chips carry no button margin, and the composer's labels sit on a 1.2 line.
 * Read from the stylesheet text.
 *
 * @spec openspec/changes/board-history-chips-and-labels/specs/timeline/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board-detail.css: the history card', () => {
	it('drops the server button margin on the kind chips', () => {
		expect(rule('.cn-look-board .cn-timeline-manage__chips .cn-timeline-manage__chip:not(.cn-look-nextcloud *)')).toContain('margin: 0')
	})

	it('sets the composer labels on a 1.2 line', () => {
		expect(rule('.cn-look-board .cn-timeline-manage__draft-label:not(.cn-look-nextcloud *)')).toContain('line-height: 1.2')
	})
})
