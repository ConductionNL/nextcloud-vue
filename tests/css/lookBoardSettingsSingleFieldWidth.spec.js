/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A single-line field in a one-column board settings card is at most 560px
 * (r29 DqBeheerGeavanceerd). Read as text: jsdom draws no layout.
 *
 * @spec openspec/changes/board-settings-single-field-width/specs/settings-board-look/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board.css: single settings field width', () => {
	it('caps text, password and select fields at 560px in one column', () => {
		const at = css.indexOf('.cn-look-board .cn-settings-fields__grid--1:not(.cn-look-nextcloud *) > .cn-settings-field--text')
		const rule = css.slice(at, css.indexOf('}', at))
		expect(at).toBeGreaterThan(-1)
		expect(rule).toContain('> .cn-settings-field--password')
		expect(rule).toContain('> .cn-settings-field--select')
		expect(rule).toContain('max-width: 560px;')
		expect(rule).not.toContain('--textarea')
	})
})
