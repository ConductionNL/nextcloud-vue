/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A warning or error banner in the board look is a tinted box with an edge
 * in its tone (PtInzending, PtAccounts). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-banner-note-tone/specs/board-banner-note-tone/spec.md#requirement-a-board-warning-or-error-banner-is-a-tinted-box-with-an-edge-in-its-tone
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function block(selector) {
	const at = css.indexOf(selector)
	expect(at).toBeGreaterThan(-1)
	const open = css.indexOf('{', at)
	return css.slice(open, css.indexOf('}', open))
}

describe('look-board.css: warning and error banners', () => {
	it('tints each tone from its own Nextcloud colour', () => {
		expect(block('.cn-look-board .cn-banner-widget .notecard.notecard--warning:not(.cn-look-nextcloud *) {')).toMatch(/--cn-banner-edge: color-mix\(in srgb, var\(--color-warning\)/)
		expect(block('.cn-look-board .cn-banner-widget .notecard.notecard--error:not(.cn-look-nextcloud *) {')).toMatch(/--cn-banner-edge: color-mix\(in srgb, var\(--color-error\)/)
	})

	it('draws the box: 1px edge in its tone, radius 10, 12px 14px, no margin', () => {
		const rule = block('.cn-look-board .cn-banner-widget .notecard.notecard--warning:not(.cn-look-nextcloud *),')
		expect(rule).toMatch(/border: 1px solid var\(--cn-banner-edge\);/)
		expect(rule).toMatch(/border-radius: 10px;/)
		expect(rule).toMatch(/padding: 12px 14px;/)
		expect(rule).toMatch(/margin: 0;/)
		expect(rule).toMatch(/background-color: var\(--cn-banner-ground\) !important;/)
	})

	it('draws no card around a stat-row banner', () => {
		const rule = block('.cn-look-board .cn-index-page-widgets__cell .cn-widget-wrapper:has(.cn-banner-widget):not(:has(.cn-widget-wrapper__header)):not(.cn-look-nextcloud *) {')
		expect(rule).toMatch(/border: none;/)
		expect(rule).toMatch(/background: transparent;/)
	})
})
