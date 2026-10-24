/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board message's meta line is 13px in a rule that names the thread, and
 * the bubble keeps 6px between it and the text (DqZaakContact). Read from the
 * stylesheet text.
 *
 * @spec openspec/changes/board-conversation-bubble-meta-gap/specs/board-conversation-bubble-meta-gap/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board-detail.css: a board message', () => {
	it('sets the meta line at 13px where the scoped 0.9em cannot win', () => {
		expect(rule('.cn-look-board .cn-conversation-thread .cn-conversation-thread__meta:not(.cn-look-nextcloud *),\n.cn-look-board .cn-conversation-thread .cn-conversation-thread__meta time:not(.cn-look-nextcloud *)')).toMatch(/font-size:\s*13px/)
	})

	it('keeps 6px between the meta line and the text', () => {
		expect(rule('.cn-look-board .cn-conversation-thread .cn-conversation-thread__bubble:not(.cn-look-nextcloud *)')).toMatch(/gap:\s*6px/)
	})
})
