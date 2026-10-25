/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The contacts tab inside a detail card (DqZaakBetrokkenen "Partijen") in the
 * board look: no inset of its own, its buttons start at the card's edge under
 * the subtitle (r25b: inset 12px and pushed to the right).
 * Read from the stylesheet text.
 *
 * @spec openspec/changes/board-contacts-in-card/specs/contacts/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

const TAB = '.cn-look-board .cn-detail-page__leaf-card .cn-contacts-tab'

describe('look-board-detail.css: the contacts tab in a card', () => {
	it('draws no inset of its own', () => {
		expect(rule(TAB)).toContain('padding: 0')
	})

	it('starts its buttons at the card edge', () => {
		expect(rule(TAB + ' .cn-contacts-tab__header')).toContain('justify-content: flex-start')
	})
})
