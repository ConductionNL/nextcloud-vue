/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Inside a record card the boards draw a chip row at 36px, radius 18, 12px in
 * (DqZaakContact's channel chips, as DqZaakHistorie's). Index-page chip bars
 * stay 38px. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-thread-filter-chips-36/specs/board-thread-filter-chips-36/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function bodyOf(selector) {
	const at = css.indexOf(selector + ' {')
	expect(at).toBeGreaterThan(-1)
	return css.slice(at, css.indexOf('}', at))
}

describe('look-board-index.css: filter chips', () => {
	it('are 36px, radius 18, 12px in inside a conversation thread', () => {
		const body = bodyOf('.cn-look-board .cn-conversation-thread .cn-quick-filter-bar .cn-quick-filter-bar__tab')
		expect(body).toContain('--nldesign-component-button-border-radius: 18px;')
		expect(body).toContain('height: 36px;')
		expect(body).toContain('min-height: 36px;')
		expect(body).toContain('padding: 0 12px;')
		expect(body).toContain('border-radius: 18px;')
	})

	it('stay 38px on an index page', () => {
		expect(css).toMatch(/\.cn-look-board \.cn-quick-filter-bar \.cn-quick-filter-bar__tab \{[^}]*height: 38px;/)
	})
})
