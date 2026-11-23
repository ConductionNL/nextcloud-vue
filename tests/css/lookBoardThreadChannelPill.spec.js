/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A message's channel pill is 20px in the board's soft ink (DqZaakContact).
 * The board rule must outrank the component's scoped rule, which sets the
 * muted grey at (0,2,0): it names the thread too. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-thread-channel-pill/specs/board-thread-channel-pill/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function bodyOf(selector) {
	const at = css.indexOf(selector + ' {')
	expect(at).toBeGreaterThan(-1)
	return css.slice(at, css.indexOf('}', at))
}

describe('look-board-detail.css: a message\'s channel pill', () => {
	it('is the soft ink at a 16px line height, above the scoped rule', () => {
		const body = bodyOf('.cn-look-board .cn-conversation-thread .cn-conversation-thread__channel')
		expect(body).toContain('color: var(--cn-board-text-soft);')
		expect(body).toContain('line-height: 16px;')
		expect(body).toContain('padding: 1px 8px;')
	})
})
