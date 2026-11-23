/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a toned tag takes the theme's status badge ground and ink
 * first. Read as text: jsdom resolves no custom properties.
 *
 * @spec openspec/changes/board-tag-tones/specs/board-tag-tones/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board.css: toned tags', () => {
	it.each(['success', 'warning', 'error', 'info'])('a %s tag reads the status badge tokens first', (tone) => {
		const sel = `.cn-look-board .cn-status-badge--${tone}:not(.cn-status-badge--solid):not(.cn-look-nextcloud *) {`
		const at = css.indexOf(sel)
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toContain(`--cn-status-badge-ink: var(--nldesign-component-status-badge-${tone}-color,`)
		expect(body).toContain(`background-color: var(--nldesign-component-status-badge-${tone}-background-color,`)
	})
})
